import { createHash, randomInt } from "node:crypto";
import { IdentityLinkRepository, IdentityLinkResult, IdentityLinkToken } from "../../core/ApplicationStorage";
import { Platform } from "../../core/Identity";
import { SqlDatabase, SqlExecutor } from "../SqlExecutor";

const TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TOKEN_LENGTH = 10;
const TOKEN_TTL_MS = 10 * 60 * 1000;

interface AccountRow {
    id: string | number;
    user_id: string | number;
    platform: Platform;
}

interface TokenRow {
    source_account_id: string | number;
}

interface PlatformRow {
    user_id: string | number;
    platform: Platform;
}

export class PostgresIdentityLinkRepository implements IdentityLinkRepository {
    constructor(private readonly db: SqlDatabase) {}

    async createToken(accountId: number): Promise<IdentityLinkToken> {
        const account = await this.db.get<AccountRow>(
            "SELECT id, user_id, platform FROM platform_accounts WHERE id = $1",
            [accountId]
        );
        if (!account) {
            throw new Error(`Platform account ${accountId} was not found`);
        }

        const code = this.generateCode();
        const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
        await this.db.transaction(async (transaction) => {
            await transaction.run("DELETE FROM identity_link_tokens WHERE expires_at <= NOW()");
            await transaction.run(
                `INSERT INTO identity_link_tokens (token_hash, source_account_id, expires_at)
                 VALUES ($1, $2, $3)`,
                [this.hash(code), accountId, expiresAt]
            );
        });
        return { code: this.formatCode(code), expiresAt };
    }

    async consumeToken(accountId: number, rawCode: string): Promise<IdentityLinkResult> {
        const code = this.normalizeCode(rawCode);
        if (code.length !== TOKEN_LENGTH) {
            return { status: "invalid-token" };
        }

        return await this.db.transaction(async (transaction) => {
            await transaction.run("DELETE FROM identity_link_tokens WHERE expires_at <= NOW()");
            const token = await transaction.get<TokenRow>(
                `SELECT token.source_account_id
                 FROM identity_link_tokens AS token
                 JOIN platform_accounts AS source ON source.id = token.source_account_id
                 WHERE token.token_hash = $1
                   AND token.expires_at > NOW()
                 FOR UPDATE OF token`,
                [this.hash(code)]
            );
            if (!token) {
                return { status: "invalid-token" };
            }

            const sourceAccountId = Number(token.source_account_id);
            if (sourceAccountId === accountId) {
                return { status: "same-account" };
            }
            await this.lockAccounts(transaction, sourceAccountId, accountId);
            const source = await transaction.get<AccountRow>(
                "SELECT id, user_id, platform FROM platform_accounts WHERE id = $1 FOR UPDATE",
                [sourceAccountId]
            );
            const target = await transaction.get<AccountRow>(
                "SELECT id, user_id, platform FROM platform_accounts WHERE id = $1 FOR UPDATE",
                [accountId]
            );
            if (!source || !target) {
                throw new Error(`Platform account ${accountId} was not found`);
            }

            const sourceUserId = Number(source.user_id);
            const targetUserId = Number(target.user_id);
            await this.lockUsers(transaction, sourceUserId, targetUserId);
            const accountPlatforms = await transaction.all<PlatformRow>(
                `SELECT user_id, platform
                 FROM platform_accounts
                 WHERE user_id = ANY($1::BIGINT[])
                 FOR UPDATE`,
                [[sourceUserId, targetUserId]]
            );
            const sourcePlatforms = new Set(
                accountPlatforms.filter((row) => Number(row.user_id) === sourceUserId).map((row) => row.platform)
            );
            const targetPlatforms = new Set(
                accountPlatforms.filter((row) => Number(row.user_id) === targetUserId).map((row) => row.platform)
            );

            if (sourceUserId === targetUserId) {
                await this.deleteToken(transaction, code);
                return {
                    status: "already-linked",
                    userId: sourceUserId,
                    platforms: [...sourcePlatforms],
                };
            }

            const conflicts = [...targetPlatforms].filter((platform) => sourcePlatforms.has(platform));
            if (conflicts.length > 0) {
                return { status: "platform-conflict", platforms: conflicts };
            }

            await this.mergeUsers(transaction, sourceUserId, targetUserId);
            await this.deleteToken(transaction, code);
            return {
                status: "linked",
                userId: sourceUserId,
                platforms: [...new Set([...sourcePlatforms, ...targetPlatforms])],
            };
        });
    }

    private async mergeUsers(transaction: SqlExecutor, sourceUserId: number, targetUserId: number): Promise<void> {
        await transaction.run(
            `INSERT INTO users (app_user_id, game_id, nickname, mode, server)
             SELECT $1, game_id, nickname, mode, server
             FROM users
             WHERE app_user_id = $2
             ON CONFLICT (app_user_id, server) DO NOTHING`,
            [sourceUserId, targetUserId]
        );
        await transaction.run("DELETE FROM users WHERE app_user_id = $1", [targetUserId]);

        await transaction.run(
            `UPDATE settings
             SET app_user_id = $1
             WHERE app_user_id = $2
               AND NOT EXISTS (SELECT 1 FROM settings WHERE app_user_id = $1)`,
            [sourceUserId, targetUserId]
        );
        await transaction.run("DELETE FROM settings WHERE app_user_id = $1", [targetUserId]);
        await transaction.run("UPDATE platform_accounts SET user_id = $1 WHERE user_id = $2", [
            sourceUserId,
            targetUserId,
        ]);
        await transaction.run("DELETE FROM app_users WHERE id = $1", [targetUserId]);
    }

    private async lockUsers(transaction: SqlExecutor, firstUserId: number, secondUserId: number): Promise<void> {
        await transaction.all(
            `SELECT id
             FROM app_users
             WHERE id = ANY($1::BIGINT[])
             ORDER BY id
             FOR UPDATE`,
            [[firstUserId, secondUserId]]
        );
    }

    private async lockAccounts(
        transaction: SqlExecutor,
        firstAccountId: number,
        secondAccountId: number
    ): Promise<void> {
        const accountIds = [...new Set([firstAccountId, secondAccountId])].sort((left, right) => left - right);
        for (const accountId of accountIds) {
            await transaction.run("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
                `identity-link:account:${accountId}`,
            ]);
        }
    }

    private async deleteToken(transaction: SqlExecutor, code: string): Promise<void> {
        await transaction.run("DELETE FROM identity_link_tokens WHERE token_hash = $1", [this.hash(code)]);
    }

    private generateCode(): string {
        let code = "";
        for (let index = 0; index < TOKEN_LENGTH; index++) {
            code += TOKEN_ALPHABET[randomInt(TOKEN_ALPHABET.length)];
        }
        return code;
    }

    private normalizeCode(code: string): string {
        return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
    }

    private formatCode(code: string): string {
        return `${code.slice(0, 5)}-${code.slice(5)}`;
    }

    private hash(code: string): string {
        return createHash("sha256").update(this.normalizeCode(code)).digest("hex");
    }
}

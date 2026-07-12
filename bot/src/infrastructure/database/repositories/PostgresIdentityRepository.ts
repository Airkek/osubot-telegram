import { ISqlDatabase } from "infrastructure/database/ISqlDatabase";
import { ISqlExecutor } from "infrastructure/database/ISqlExecutor";
import { ExternalId } from "core/ExternalId";
import { IIdentityRepository } from "core/IIdentityRepository";
import { normalizeExternalId } from "core/ExternalId";
import { Platform } from "core/Platform";
import { IPlatformAccountIdentity } from "core/IPlatformAccountIdentity";
import { IPlatformChatIdentity } from "core/IPlatformChatIdentity";

interface PlatformAccountRow {
    account_id: string | number;
    user_id: string | number;
    platform: Platform;
    external_id: string;
}

interface PlatformChatRow {
    chat_id: string | number;
    platform: Platform;
    external_id: string;
}

export class PostgresIdentityRepository implements IIdentityRepository {
    constructor(
        private readonly db: ISqlDatabase,
        readonly platform: Platform
    ) {}

    async findUser(externalId: ExternalId): Promise<IPlatformAccountIdentity | null> {
        return this.findUserWith(this.db, externalId);
    }

    async resolveUser(externalId: ExternalId): Promise<IPlatformAccountIdentity> {
        const existing = await this.findUser(externalId);
        if (existing) {
            return existing;
        }

        const normalizedId = normalizeExternalId(externalId);
        return this.db.transaction(async (transaction) => {
            await transaction.run("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
                `${this.platform}:user:${normalizedId}`,
            ]);

            const concurrent = await this.findUserWith(transaction, normalizedId);
            if (concurrent) {
                return concurrent;
            }

            const user = await transaction.get<{ id: string | number }>(
                "INSERT INTO app_users DEFAULT VALUES RETURNING id"
            );
            const row = await transaction.get<PlatformAccountRow>(
                `INSERT INTO platform_accounts (user_id, platform, external_id)
                 VALUES ($1, $2, $3)
                 RETURNING id AS account_id, user_id, platform, external_id`,
                [user.id, this.platform, normalizedId]
            );
            return this.mapUser(row);
        });
    }

    async getUser(accountId: number): Promise<IPlatformAccountIdentity | null> {
        const row = await this.db.get<PlatformAccountRow>(
            `SELECT id AS account_id, user_id, platform, external_id
             FROM platform_accounts
             WHERE id = $1 AND platform = $2`,
            [accountId, this.platform]
        );
        return row ? this.mapUser(row) : null;
    }

    async findChat(externalId: ExternalId): Promise<IPlatformChatIdentity | null> {
        const row = await this.db.get<PlatformChatRow>(
            `SELECT id AS chat_id, platform, external_id
             FROM platform_chats
             WHERE platform = $1 AND external_id = $2`,
            [this.platform, normalizeExternalId(externalId)]
        );
        return row ? this.mapChat(row) : null;
    }

    async resolveChat(externalId: ExternalId): Promise<IPlatformChatIdentity> {
        const normalizedId = normalizeExternalId(externalId);
        const row = await this.db.get<PlatformChatRow>(
            `WITH inserted AS (
                 INSERT INTO platform_chats (platform, external_id)
                 VALUES ($1, $2)
                 ON CONFLICT (platform, external_id) DO NOTHING
                 RETURNING id AS chat_id, platform, external_id
             )
             SELECT chat_id, platform, external_id FROM inserted
             UNION ALL
             SELECT id AS chat_id, platform, external_id
             FROM platform_chats
             WHERE platform = $1 AND external_id = $2
             LIMIT 1`,
            [this.platform, normalizedId]
        );
        return this.mapChat(row);
    }

    async getChat(chatId: number): Promise<IPlatformChatIdentity | null> {
        const row = await this.db.get<PlatformChatRow>(
            `SELECT id AS chat_id, platform, external_id
             FROM platform_chats
             WHERE id = $1 AND platform = $2`,
            [chatId, this.platform]
        );
        return row ? this.mapChat(row) : null;
    }

    async getUserAccounts(userId: number): Promise<IPlatformAccountIdentity[]> {
        const rows = await this.db.all<PlatformAccountRow>(
            `SELECT id AS account_id, user_id, platform, external_id
             FROM platform_accounts
             WHERE user_id = $1
             ORDER BY id`,
            [userId]
        );
        return rows.map((row) => this.mapUser(row));
    }

    private async findUserWith(db: ISqlExecutor, externalId: ExternalId): Promise<IPlatformAccountIdentity | null> {
        const row = await db.get<PlatformAccountRow>(
            `SELECT id AS account_id, user_id, platform, external_id
             FROM platform_accounts
             WHERE platform = $1 AND external_id = $2`,
            [this.platform, normalizeExternalId(externalId)]
        );
        return row ? this.mapUser(row) : null;
    }

    private mapUser(row: PlatformAccountRow): IPlatformAccountIdentity {
        return {
            accountId: Number(row.account_id),
            userId: Number(row.user_id),
            platform: row.platform,
            externalId: row.external_id,
        };
    }

    private mapChat(row: PlatformChatRow): IPlatformChatIdentity {
        return {
            chatId: Number(row.chat_id),
            platform: row.platform,
            externalId: row.external_id,
        };
    }
}

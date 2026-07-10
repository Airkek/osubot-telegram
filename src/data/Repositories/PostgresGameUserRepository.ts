import { GameUserRepository } from "../../core/ApplicationStorage";
import { Platform } from "../../core/Identity";
import { APIUser, IDatabaseUser, IDatabaseUserStats } from "../../Types";
import { SqlExecutor } from "../SqlExecutor";

interface GameUserLinkRow {
    id: string | number;
    account_id?: string | number;
    game_id: string;
    nickname: string;
    mode: number;
}

export class PostgresGameUserRepository implements GameUserRepository {
    constructor(
        private readonly serverName: string,
        private readonly db: SqlExecutor,
        private readonly platform: Platform
    ) {}

    async getUser(userId: number): Promise<IDatabaseUser | null> {
        const row = await this.db.get<GameUserLinkRow>(
            `SELECT link.app_user_id AS id, account.id AS account_id, link.game_id, link.nickname, link.mode
             FROM users AS link
             LEFT JOIN platform_accounts AS account
                    ON account.user_id = link.app_user_id AND account.platform = $3
             WHERE link.app_user_id = $1 AND link.server = $2`,
            [userId, this.serverName, this.platform]
        );
        return row ? this.mapLink(row) : null;
    }

    async findByUserId(id: number | string): Promise<IDatabaseUser[]> {
        const rows = await this.db.all<GameUserLinkRow>(
            `SELECT link.app_user_id AS id, account.id AS account_id, link.game_id, link.nickname, link.mode
             FROM users AS link
             JOIN platform_accounts AS account ON account.user_id = link.app_user_id
             WHERE link.game_id = $1
               AND link.server = $2
               AND account.platform = $3`,
            [id, this.serverName, this.platform]
        );
        return rows.map((row) => this.mapLink(row));
    }

    async setNickname(userId: number, gameUserId: number | string, nickname: string, mode: number = 0): Promise<void> {
        await this.db.run(
            `INSERT INTO users (app_user_id, game_id, nickname, mode, server)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (app_user_id, server) DO UPDATE
             SET game_id = EXCLUDED.game_id,
                 nickname = EXCLUDED.nickname,
                 mode = EXCLUDED.mode`,
            [userId, gameUserId, nickname, mode, this.serverName]
        );
    }

    async setMode(userId: number, mode: number): Promise<boolean> {
        const result = await this.db.run("UPDATE users SET mode = $1 WHERE app_user_id = $2 AND server = $3", [
            mode,
            userId,
            this.serverName,
        ]);
        return (result.rowCount ?? 0) > 0;
    }

    async updateInfo(user: APIUser, mode: number): Promise<void> {
        await this.db.run(
            `INSERT INTO stats (id, nickname, pp, rank, acc, mode, server)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (id, server, mode) DO UPDATE
             SET nickname = EXCLUDED.nickname,
                 pp = EXCLUDED.pp,
                 rank = EXCLUDED.rank,
                 acc = EXCLUDED.acc`,
            [user.id, user.nickname, user.pp, user.rank.total, user.accuracy, mode, this.serverName]
        );
    }

    async getUserStats(userId: number, mode: number): Promise<IDatabaseUserStats | null> {
        const user = await this.getUser(userId);
        if (!user) {
            return null;
        }
        return this.db.get<IDatabaseUserStats>(
            `SELECT id, nickname, pp, rank, acc
             FROM stats
             WHERE id = $1 AND mode = $2 AND server = $3`,
            [user.game_id, mode, this.serverName]
        );
    }

    private mapLink(row: GameUserLinkRow): IDatabaseUser {
        return {
            id: Number(row.id),
            account_id: row.account_id == null ? undefined : Number(row.account_id),
            game_id: row.game_id,
            nickname: row.nickname,
            mode: row.mode,
        };
    }
}

import { GameServerName, MaintenanceRepository, MaintenanceTarget } from "../../core/ApplicationStorage";
import { SqlExecutor } from "../SqlExecutor";

const TABLES: Record<MaintenanceTarget, string> = {
    beatmapMetadata: "osu_beatmap_metadata",
    covers: "covers",
    photos: "photos",
    gameLinks: "users",
    gameStats: "stats",
};

const SERVER_SCOPED_TARGETS = new Set<MaintenanceTarget>(["gameLinks", "gameStats"]);

interface CountRow {
    count: number;
}

export class MaintenanceModel implements MaintenanceRepository {
    constructor(private readonly db: SqlExecutor) {}

    async count(target: MaintenanceTarget, server?: GameServerName): Promise<number> {
        const table = TABLES[target];
        const scoped = server && SERVER_SCOPED_TARGETS.has(target);
        const query = `SELECT COUNT(*)::INT AS count FROM ${table}${scoped ? " WHERE server = $1" : ""}`;
        const row = await this.db.get<CountRow>(query, scoped ? [server] : []);
        return row?.count ?? 0;
    }

    async clear(target: MaintenanceTarget, server?: GameServerName): Promise<number> {
        const table = TABLES[target];
        const scoped = server && SERVER_SCOPED_TARGETS.has(target);
        const query = `DELETE FROM ${table}${scoped ? " WHERE server = $1" : ""}`;
        const result = await this.db.run(query, scoped ? [server] : []);
        return result.rowCount ?? 0;
    }
}

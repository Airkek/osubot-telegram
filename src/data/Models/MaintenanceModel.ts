import { GameServerName, MaintenanceRepository, MaintenanceTarget } from "../../core/ApplicationStorage";
import { SqlExecutor } from "../SqlExecutor";
import { Platform } from "../../core/Identity";

const TABLES: Record<MaintenanceTarget, string> = {
    beatmapMetadata: "osu_beatmap_metadata",
    covers: "covers",
    photos: "photos",
    gameLinks: "users",
    gameStats: "stats",
};

const SERVER_SCOPED_TARGETS = new Set<MaintenanceTarget>(["gameLinks", "gameStats"]);
const PLATFORM_SCOPED_TARGETS = new Set<MaintenanceTarget>(["covers", "photos"]);

interface CountRow {
    count: number;
}

export class MaintenanceModel implements MaintenanceRepository {
    constructor(
        private readonly db: SqlExecutor,
        private readonly platform: Platform
    ) {}

    async count(target: MaintenanceTarget, server?: GameServerName): Promise<number> {
        const table = TABLES[target];
        const [where, params] = this.scope(target, server);
        const query = `SELECT COUNT(*)::INT AS count FROM ${table}${where}`;
        const row = await this.db.get<CountRow>(query, params);
        return row?.count ?? 0;
    }

    async clear(target: MaintenanceTarget, server?: GameServerName): Promise<number> {
        const table = TABLES[target];
        const [where, params] = this.scope(target, server);
        const query = `DELETE FROM ${table}${where}`;
        const result = await this.db.run(query, params);
        return result.rowCount ?? 0;
    }

    private scope(target: MaintenanceTarget, server?: GameServerName): [string, unknown[]] {
        if (server && SERVER_SCOPED_TARGETS.has(target)) {
            return [" WHERE server = $1", [server]];
        }
        if (PLATFORM_SCOPED_TARGETS.has(target)) {
            return [" WHERE platform = $1", [this.platform]];
        }
        return ["", []];
    }
}

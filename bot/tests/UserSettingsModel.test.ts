import { ISqlExecutionResult } from "../src/infrastructure/database/ISqlExecutionResult";
import { ISqlExecutor } from "../src/infrastructure/database/ISqlExecutor";
import { SqlParameters } from "../src/infrastructure/database/SqlParameters";
import { describe, expect, test } from "@jest/globals";
import { IUserSettings } from "../src/core/IUserSettings";
import { UserSettingsModel } from "../src/infrastructure/database/models/settings/UserSettingsModel";

class SettingsSqlFake implements ISqlExecutor {
    readonly writes: Array<{ statement: string; parameters?: SqlParameters }> = [];

    constructor(private readonly rows: Map<number, IUserSettings>) {}

    async get<T>(_statement: string, parameters?: SqlParameters): Promise<T | null> {
        return (this.rows.get(Number(parameters?.[1])) as T | undefined) ?? null;
    }

    async all<T>(): Promise<T[]> {
        return [];
    }

    async run(statement: string, parameters?: SqlParameters): Promise<ISqlExecutionResult> {
        this.writes.push({ statement, parameters });
        return { rowCount: 1 };
    }
}

function settings(accountId: number, platform: "telegram" | "vk", contentOutput: "oki-cards" | "legacy-text") {
    return {
        user_id: 42,
        account_id: accountId,
        platform,
        render_enabled: true,
        notifications_enabled: true,
        enable_find: false,
        language_override: "do_not_override",
        content_output: contentOutput,
        ordr_skin: "default",
        ordr_video: true,
        ordr_storyboard: true,
        ordr_bgdim: 75,
        ordr_pp_counter: true,
        ordr_ur_counter: true,
        ordr_hit_counter: true,
        ordr_strain_graph: true,
        ordr_is_skin_custom: false,
        ordr_master_volume: 50,
        ordr_music_volume: 50,
        ordr_effects_volume: 50,
        experimental_renderer: false,
    } satisfies IUserSettings;
}

describe("platform account settings", () => {
    test("keeps output and discoverability separate for linked platform accounts", async () => {
        const sql = new SettingsSqlFake(
            new Map([
                [10, settings(10, "telegram", "oki-cards")],
                [20, settings(20, "vk", "legacy-text")],
            ])
        );
        const model = new UserSettingsModel(sql);

        const telegram = await model.getUserSettings(42, 10);
        const vk = await model.getUserSettings(42, 20);

        expect(telegram).toMatchObject({ account_id: 10, content_output: "oki-cards", enable_find: false });
        expect(vk).toMatchObject({ account_id: 20, content_output: "legacy-text", enable_find: false });

        vk.content_output = "oki-cards";
        vk.enable_find = true;
        vk.ordr_video = false;
        await model.updateSettings(vk);

        const sharedWrite = sql.writes.find((write) => write.statement.includes("UPDATE settings"));
        const accountWrite = sql.writes.find((write) =>
            write.statement.includes("INSERT INTO platform_account_settings")
        );
        expect(sharedWrite?.parameters?.[2]).toBe(false);
        expect(sharedWrite?.parameters?.at(-1)).toBe(42);
        expect(accountWrite?.parameters).toEqual([20, true, "do_not_override", "oki-cards", true]);
    });
});

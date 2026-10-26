import { describe, expect, test } from "@jest/globals";
import { IEventContext } from "../src/core/storage/IEventContext";
import { ISqlExecutor } from "../src/infrastructure/database/ISqlExecutor";
import { SqlParameters } from "../src/infrastructure/database/SqlParameters";
import { StatisticsModel } from "../src/infrastructure/database/models/StatisticsModel";

function createTelemetry() {
    const writes: Array<{ statement: string; parameters: SqlParameters }> = [];
    const sql = {
        run: async (statement: string, parameters: SqlParameters) => {
            writes.push({ statement, parameters });
            return { rowCount: 1 };
        },
    } as ISqlExecutor;
    return { telemetry: new StatisticsModel(sql, "vk"), writes };
}

const context = { platform: "vk", senderId: 42, chatId: 101 } as IEventContext;

describe("rendered video telemetry", () => {
    test("stores the measured fractional duration and byte size on render success", async () => {
        const { telemetry, writes } = createTelemetry();
        await telemetry.logRenderSuccess(context, 3, true, {
            durationSeconds: 123.456,
            sizeBytes: 5_000_000_000,
        });

        expect(writes).toHaveLength(1);
        expect(writes[0].statement).toContain("video_duration_seconds, video_size_bytes");
        expect(writes[0].parameters).toEqual(["render_success", "vk", 42, 101, true, 3, null, 123.456, 5_000_000_000]);
    });

    test("keeps unknown video measurements null instead of recording a fake zero", async () => {
        const { telemetry, writes } = createTelemetry();
        await telemetry.logRenderSuccess(context, 0, false, {});
        await telemetry.logRenderStart(context, 0, false);
        await telemetry.logRenderFailed(context, 0, "Renderer failed", false);

        expect(writes.map(({ parameters }) => parameters.slice(-2))).toEqual([
            [null, null],
            [null, null],
            [null, null],
        ]);
        expect(writes[2].parameters[6]).toBe("Renderer failed");
    });
});

import { afterEach, describe, expect, jest, test } from "@jest/globals";
import { Morasooma } from "../src/commands/modules/morasooma/Morasooma";
import { OsuReplay } from "../src/commands/modules/simple/OsuReplay";
import { SimpleCommandsModule } from "../src/commands/modules/simple/SimpleCommandsModule";
import { IBotRuntime } from "../src/core/IBotRuntime";
import { IMessageContext } from "../src/core/IMessageContext";
import { GameApiRegistry } from "../src/games/GameApiRegistry";
import { createTestStorage } from "./fakes/ApplicationStorageFake";
import { RecentCommand } from "../src/commands/modules/server/RecentCommand";
import { ICommandArgs } from "../src/commands/ICommandArgs";
import * as renderers from "../src/games/osu/replays/rendering/IssouBestRenderer";

afterEach(() => jest.restoreAllMocks());

function createRuntime(overrides: Partial<IBotRuntime> = {}) {
    return {
        api: new GameApiRegistry({
            banchoClientId: 1,
            banchoClientSecret: "secret",
            morasoomaClientId: 78,
            morasoomaClientSecret: "morasooma-client-secret",
        }),
        storage: createTestStorage(),
        osuBeatmapProvider: {},
        ...overrides,
    } as IBotRuntime;
}

describe("Morasooma commands", () => {
    test.each(["m", "ь"])("routes %s to its own API and account repository", (prefix) => {
        const runtime = createRuntime();
        const module = new Morasooma(runtime);
        const ctx = { text: `${prefix} u player` } as IMessageContext;

        expect(module.checkContext(ctx)?.command.name).toBe("user");
        expect(module.api).toBe(runtime.api.morasooma);
        expect(module.db).toBe(runtime.storage.gameServers.morasooma);
        expect(module.db).not.toBe(runtime.storage.gameServers.bancho);
    });

    test("recent score render button contains the Morasooma source", async () => {
        const runtime = createRuntime();
        const reply = jest.fn<IMessageContext["reply"]>(async () => {});
        const module = new Morasooma(runtime);
        module.api = {
            getUser: async () => {
                throw new Error("Unexpected lookup");
            },
            getScore: async () => undefined,
            getUserRecent: async () => ({
                api_score_id: 213468,
                has_replay: true,
                beatmap: { id: 1782390 },
            }),
        } as never;
        Object.assign(runtime, {
            replies: { scoreData: async () => ({ text: "score" }) },
            chatBeatmaps: { setMap: () => {} },
        });
        const command = module.commands.find((entry) => entry instanceof RecentCommand);
        const previous = process.env.RENDER_REPLAYS;
        process.env.RENDER_REPLAYS = "true";
        try {
            await command.function({ reply, tr: (key: string) => key } as unknown as IMessageContext, command, {
                nickname: ["player"],
                mode: 0,
            } as ICommandArgs);
            expect(reply).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    keyboard: expect.arrayContaining([
                        expect.arrayContaining([expect.objectContaining({ command: "render_morasooma:213468" })]),
                    ]),
                })
            );
        } finally {
            if (previous === undefined) delete process.env.RENDER_REPLAYS;
            else process.env.RENDER_REPLAYS = previous;
        }
    });

    test.each(["render_bancho", "render_morasooma"])("downloads %s replays from the correct API", async (source) => {
        const runtime = createRuntime();
        const marker = new Error("Stop before replay decoding");
        const official = jest.spyOn(runtime.api.bancho, "downloadReplay").mockRejectedValue(marker);
        const privateServer = jest.spyOn(runtime.api.morasooma, "downloadReplay").mockRejectedValue(marker);
        jest.spyOn(renderers, "IssouBestRenderer").mockImplementation(() => ({}) as never);
        const replay = new OsuReplay({ bot: runtime } as SimpleCommandsModule);
        const ctx = { messagePayload: `${source}:213468`, hasFile: () => false } as IMessageContext;

        expect(replay.check("", ctx)).toBe(true);
        await expect(replay.function(ctx, replay, undefined)).rejects.toBe(marker);
        expect(source === "render_bancho" ? official : privateServer).toHaveBeenCalledWith(213468);
        expect(source === "render_bancho" ? privateServer : official).not.toHaveBeenCalled();
    });

    test("ignores stale Morasooma render buttons when its credentials are missing", async () => {
        const runtime = createRuntime({
            api: new GameApiRegistry({ banchoClientId: 1, banchoClientSecret: "secret" }),
        });
        const official = jest.spyOn(runtime.api.bancho, "downloadReplay");
        jest.spyOn(renderers, "IssouBestRenderer").mockImplementation(() => ({}) as never);
        const replay = new OsuReplay({ bot: runtime } as SimpleCommandsModule);
        const ctx = { messagePayload: "render_morasooma:213468", hasFile: () => false } as IMessageContext;

        expect(runtime.api.morasooma).toBeUndefined();
        expect(replay.check("", ctx)).toBe(false);
        await expect(replay.function(ctx, replay, undefined)).resolves.toBeUndefined();
        expect(official).not.toHaveBeenCalled();
    });
});

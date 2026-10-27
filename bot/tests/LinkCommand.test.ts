import { describe, expect, jest, test } from "@jest/globals";
import { Bancho } from "../src/commands/modules/bancho/Bancho";
import { Morasooma } from "../src/commands/modules/morasooma/Morasooma";
import { ICommandArgs } from "../src/commands/ICommandArgs";
import { IBotRuntime } from "../src/core/IBotRuntime";
import { IMessageContext } from "../src/core/IMessageContext";
import { GameApiRegistry } from "../src/games/GameApiRegistry";
import { IGameUser } from "../src/games/users/IGameUser";
import { LinkServiceClient } from "../src/infrastructure/link/LinkServiceClient";
import { createTestStorage } from "./fakes/ApplicationStorageFake";

function createLink(server: "bancho" | "morasooma", supported: string[] = ["bancho", "morasooma"], enabled = true) {
    const service = new LinkServiceClient(enabled ? "https://link.test" : undefined, "https://link.test/link");
    const request = jest.fn<(url: string, options?: unknown) => Promise<unknown>>(async (url) => ({
        data: url === "/api/servers" ? { servers: supported } : { server, user_id: "130", is_restrict: true },
    }));
    if (service.api) service.api.get = request as never;
    const storage = createTestStorage();
    const runtime = {
        api: new GameApiRegistry({
            banchoClientId: 42,
            banchoClientSecret: "bancho-secret",
            morasoomaClientId: 78,
            morasoomaClientSecret: "morasooma-secret",
        }),
        linkService: service,
        storage,
        osuBeatmapProvider: {},
    } as IBotRuntime;
    const module = server === "bancho" ? new Bancho(runtime) : new Morasooma(runtime);
    const profile = { id: 130, nickname: "player", mode: 0 } as IGameUser;
    const byId = jest.spyOn(module.api, "getUserById").mockResolvedValue(profile);
    const byName = jest.spyOn(module.api, "getUser").mockResolvedValue(profile);
    const save = jest.spyOn(module.db, "setNickname");
    const reply = jest.fn<IMessageContext["reply"]>(async () => {});
    const tr = jest.fn((key: string, args?: Record<string, unknown>) => key + (args ? JSON.stringify(args) : ""));
    const ctx = { userId: 7, reply, tr } as unknown as IMessageContext;
    const command = module.commands.find((entry) => entry.name === "link");
    const run = (value: string) =>
        command.function(ctx, command, { full: value ? [value] : [], nickname: value ? [value] : [] } as ICommandArgs);
    return { module, service, request, byId, byName, save, reply, tr, run };
}

describe("server account linking", () => {
    test.each(["bancho", "morasooma"] as const)("saves %s links in that server's repository", async (server) => {
        const link = createLink(server);
        await link.run("ABCDEFGH");
        expect(link.request).toHaveBeenCalledWith("/api/verify", { params: { code: "ABCDEFGH", server } });
        expect(link.byId).toHaveBeenCalledWith("130");
        expect(link.byName).not.toHaveBeenCalled();
        expect(link.save).toHaveBeenCalledWith(7, 130, "player", 0);
        expect(link.reply.mock.calls[0][0]).toContain("link-restricted-warning");
    });

    test("offers the Morasooma link page and command prefix when no code was supplied", async () => {
        const link = createLink("morasooma");
        await link.run("");
        expect(link.tr).toHaveBeenCalledWith("link-code-not-specified-with-url", {
            prefix: "m",
            url: "https://link.test/link?server=morasooma",
        });
        expect(link.request).toHaveBeenCalledTimes(1);
        expect(link.save).not.toHaveBeenCalled();
    });

    test("retains nickname setup when the service does not support Morasooma", async () => {
        const link = createLink("morasooma", ["bancho"]);
        await link.run("player");
        expect(link.byName).toHaveBeenCalledWith("player");
        expect(link.byId).not.toHaveBeenCalled();
        expect(link.request).toHaveBeenCalledTimes(1);
        expect(link.save).toHaveBeenCalledWith(7, 130, "player", 0);
    });

    test.each(["bancho", "morasooma"] as const)(
        "keeps %s nickname setup with no link service configured",
        async (server) => {
            const link = createLink(server, [], false);
            await link.run("player");
            expect(link.byName).toHaveBeenCalledWith("player");
            expect(link.request).not.toHaveBeenCalled();
            expect(link.save).toHaveBeenCalled();
        }
    );

    test("rejects a Bancho code in the Morasooma command before looking up or saving an account", async () => {
        const link = createLink("morasooma");
        link.request.mockImplementation(async (url) => ({
            data: url === "/api/servers" ? { servers: ["morasooma"] } : { server: "bancho", user_id: "130" },
        }));
        await link.run("ABCDEFGH");
        expect(link.reply.mock.calls[0][0]).toContain("link-code-invalid");
        expect(link.byId).not.toHaveBeenCalled();
        expect(link.byName).not.toHaveBeenCalled();
        expect(link.save).not.toHaveBeenCalled();
    });

    test("does not bypass verification with nickname setup when discovery fails", async () => {
        const link = createLink("bancho");
        link.request.mockRejectedValue(new Error("service offline"));
        await link.run("player");
        expect(link.reply.mock.calls[0][0]).toContain("link-service-unavailable");
        expect(link.byName).not.toHaveBeenCalled();
        expect(link.save).not.toHaveBeenCalled();
    });
});

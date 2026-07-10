import { expect, test } from "@jest/globals";
import { ApplicationStorage } from "../src/core/ApplicationStorage";
import { Platform } from "../src/core/Identity";
import { PlatformStorage } from "../src/core/PlatformStorage";
import { createTestStorage } from "./fakes/ApplicationStorageFake";

function storageFor(platform: Platform): ApplicationStorage {
    const base = createTestStorage();
    return {
        ...base,
        platform,
        identities: {
            ...base.identities,
            platform,
            resolveUser: async (externalId) => ({
                accountId: platform === "telegram" ? 10 : 20,
                userId: platform === "telegram" ? 100 : 200,
                platform,
                externalId: String(externalId),
            }),
        },
        gameServers: {
            ...base.gameServers,
            bancho: {
                ...base.gameServers.bancho,
                getUser: async () => ({
                    id: platform === "telegram" ? 100 : 200,
                    game_id: platform,
                    nickname: platform,
                    mode: 0,
                }),
            },
        },
    };
}

test("platform storage preserves routing across concurrent async work", async () => {
    const storage = new PlatformStorage([storageFor("telegram"), storageFor("vk")]);
    const capturedRepository = storage.gameServers.bancho;

    const run = (platform: Platform) =>
        storage.runWithPlatform(platform, async () => {
            await new Promise<void>((resolve) => setImmediate(resolve));
            const identity = await storage.identities.resolveUser(123);
            await new Promise<void>((resolve) => setImmediate(resolve));
            const gameUser = await capturedRepository.getUser(identity.userId);
            return { current: storage.currentPlatform, identity, gameUser };
        });

    const [telegram, vk] = await Promise.all([run("telegram"), run("vk")]);

    expect(telegram.current).toBe("telegram");
    expect(telegram.identity.platform).toBe("telegram");
    expect(telegram.gameUser.nickname).toBe("telegram");
    expect(vk.current).toBe("vk");
    expect(vk.identity.platform).toBe("vk");
    expect(vk.gameUser.nickname).toBe("vk");
});

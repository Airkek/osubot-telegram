import { expect, test } from "@jest/globals";
import { ApplicationRuntime, RuntimeDependencies } from "../src/core/ApplicationRuntime";
import { MessageIdentity } from "../src/core/Identity";
import { createTestStorage } from "./fakes/ApplicationStorageFake";

global.logger = {
    info() {},
    error() {},
    trace() {},
} as typeof global.logger;

function createDependencies(overrides: Partial<RuntimeDependencies> = {}): RuntimeDependencies {
    return {
        storage: createTestStorage(),
        api: {
            bancho: {
                login: async () => {},
            },
        },
        osuBeatmapProvider: {},
        templates: {},
        maps: {},
        ignored: {
            init: async () => {},
            isIgnored: () => false,
        },
        track: {},
        replyUtils: {},
        sendMessage: async () => {},
        moduleFactories: [],
        ...overrides,
    } as RuntimeDependencies;
}

test("runtime initializes injected services and dispatches a matching command", async () => {
    const calls: string[] = [];
    let factoryRuntime: ApplicationRuntime;
    const command = {
        name: "test",
        process: async () => calls.push("command"),
    };
    const dependencies = createDependencies({
        storage: createTestStorage({
            initialize: async () => {
                calls.push("database");
            },
            telemetry: {
                ...createTestStorage().telemetry,
                logMessage: async () => calls.push("stats"),
            },
        }),
        api: {
            bancho: {
                login: async () => calls.push("api"),
            },
        } as unknown as RuntimeDependencies["api"],
        ignored: {
            init: async () => calls.push("ignored"),
            isIgnored: () => false,
        } as unknown as RuntimeDependencies["ignored"],
        moduleFactories: [
            (runtime) => {
                factoryRuntime = runtime as ApplicationRuntime;
                return {
                    name: "Test",
                    commands: [command],
                    checkContext: () => ({ command }),
                } as never;
            },
        ],
    });
    const runtime = new ApplicationRuntime(dependencies);

    await runtime.initialize();
    await runtime.handleMessage({
        platform: "telegram",
        externalSenderId: 1,
        externalChatId: 2,
        senderId: 1,
        userId: 1,
        chatId: 2,
        isInGroupChat: false,
        bindIdentity() {},
        ensureUserInfoUpdated: async () => calls.push("context"),
        checkFeature: async () => false,
    } as never);

    expect(factoryRuntime).toBe(runtime);
    expect(calls).toEqual(["database", "ignored", "api", "context", "stats", "command"]);
});

test("completed callbacks are removed from the shared runtime", async () => {
    const runtime = new ApplicationRuntime(createDependencies());
    await runtime.initialize();
    let callbackRuns = 0;
    const context = {
        platform: "telegram",
        externalSenderId: 1,
        externalChatId: 2,
        senderId: 1,
        userId: 1,
        chatId: 2,
        isInGroupChat: false,
        bindIdentity() {},
        ensureUserInfoUpdated: async () => {},
        checkFeature: async () => false,
        activateLocalisator: async () => {},
        reply: async () => {},
        tr: (key: string) => key,
    } as never;

    runtime.addCallback(context, async () => {
        callbackRuns++;
        return true;
    });
    await runtime.handleMessage(context);
    await runtime.handleMessage(context);

    expect(callbackRuns).toBe(1);
});

test("runtime resolves and binds platform identities before dispatch", async () => {
    const storage = createTestStorage();
    storage.identities.resolveUser = async (externalId) => {
        const reply = String(externalId) === "33";
        return {
            accountId: reply ? 103 : 101,
            userId: reply ? 203 : 201,
            platform: "telegram",
            externalId: String(externalId),
        };
    };
    storage.identities.resolveChat = async (externalId) => ({
        chatId: 301,
        platform: "telegram",
        externalId: String(externalId),
    });

    const command = {
        name: "identity",
        process: async (ctx: {
            senderId: number;
            userId: number;
            chatId: number;
            replyMessage: { senderId: number; userId: number; chatId: number };
        }) => {
            expect(ctx.senderId).toBe(101);
            expect(ctx.userId).toBe(201);
            expect(ctx.chatId).toBe(301);
            expect(ctx.replyMessage).toMatchObject({ senderId: 103, userId: 203, chatId: 301 });
        },
    };
    const runtime = new ApplicationRuntime(
        createDependencies({
            storage,
            moduleFactories: [
                () =>
                    ({
                        name: "Identity",
                        commands: [command],
                        checkContext: () => ({ command }),
                    }) as never,
            ],
        })
    );
    await runtime.initialize();

    const context = {
        platform: "telegram",
        externalSenderId: 11,
        externalChatId: 22,
        senderId: 0,
        userId: 0,
        chatId: 0,
        replyMessage: {
            text: "reply",
            externalSenderId: 33,
            externalChatId: 22,
        },
        isInGroupChat: false,
        bindIdentity(identity: MessageIdentity) {
            this.senderId = identity.user.accountId;
            this.userId = identity.user.userId;
            this.chatId = identity.chat.chatId;
            this.replyMessage.senderId = identity.replyUser.accountId;
            this.replyMessage.userId = identity.replyUser.userId;
            this.replyMessage.chatId = identity.chat.chatId;
        },
        ensureUserInfoUpdated: async () => {},
        checkFeature: async () => false,
    };

    await runtime.handleMessage(context as never);
});

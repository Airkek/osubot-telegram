import { expect, test } from "@jest/globals";
import { ApplicationRuntime } from "../src/application/ApplicationRuntime";
import { IRuntimeDependencies } from "../src/application/IRuntimeDependencies";
import { IMessageIdentity } from "../src/core/IMessageIdentity";
import { createTestStorage } from "./fakes/ApplicationStorageFake";

global.logger = {
    info() {},
    error() {},
    trace() {},
} as typeof global.logger;

function createDependencies(overrides: Partial<IRuntimeDependencies> = {}): IRuntimeDependencies {
    return {
        storage: createTestStorage(),
        api: {
            bancho: {
                login: async () => {},
            },
        },
        osuBeatmapProvider: {},
        templates: {},
        chatBeatmaps: {},
        ignored: {
            init: async () => {},
            isIgnored: () => false,
        },
        track: {},
        replies: {},
        sendMessage: async () => {},
        moduleBuilders: [],
        ...overrides,
    } as IRuntimeDependencies;
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
        } as unknown as IRuntimeDependencies["api"],
        ignored: {
            init: async () => calls.push("ignored"),
            isIgnored: () => false,
        } as unknown as IRuntimeDependencies["ignored"],
        moduleBuilders: [
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
        activateLocalizer: async () => {},
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

test("runtime checks and closes the performance service", async () => {
    const calls: string[] = [];
    const runtime = new ApplicationRuntime(
        createDependencies({
            performanceClient: {
                health: async () => {
                    calls.push("health");
                    return { status: "ok", version: "test" };
                },
                close: () => calls.push("close"),
            },
        })
    );

    await runtime.initialize();
    await runtime.stop();

    expect(calls).toEqual(["health", "close"]);
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
            moduleBuilders: [
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
        bindIdentity(identity: IMessageIdentity) {
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

async function dispatchVKCommandWithForcedOnboarding(commandName: string): Promise<string[]> {
    const calls: string[] = [];
    const requestedCommand = {
        name: commandName,
        process: async () => calls.push(commandName),
    };
    const onboardingCommand = {
        name: "onboarding",
        process: async () => calls.push("onboarding"),
    };
    const storage = createTestStorage({
        platform: "vk",
        onboarding: {
            getUserOnboardingVersion: async () => 0,
            isUserNeedOnboarding: async () => true,
            userOnboarded: async () => {},
            clearCache: () => {},
        },
    });
    const runtime = new ApplicationRuntime(
        createDependencies({
            storage,
            moduleBuilders: [
                () =>
                    ({
                        name: "Requested",
                        commands: [requestedCommand],
                        checkContext: () => ({ command: requestedCommand }),
                    }) as never,
                () =>
                    ({
                        name: "Main",
                        commands: [onboardingCommand],
                        checkContext: () => null,
                    }) as never,
            ],
        })
    );
    await runtime.initialize();

    await runtime.handleMessage({
        platform: "vk",
        externalSenderId: 217888904,
        externalChatId: 217888904,
        senderId: 0,
        userId: 0,
        chatId: 0,
        isInGroupChat: false,
        bindIdentity(identity: IMessageIdentity) {
            this.senderId = identity.user.accountId;
            this.userId = identity.user.userId;
            this.chatId = identity.chat.chatId;
        },
        ensureUserInfoUpdated: async () => {},
        checkFeature: async (feature: string) => feature === "force-onboarding",
    } as never);

    return calls;
}

test("runtime forces onboarding before a regular VK command", async () => {
    await expect(dispatchVKCommandWithForcedOnboarding("settings")).resolves.toEqual(["onboarding"]);
});

test("account linking can be the first VK command before onboarding", async () => {
    await expect(dispatchVKCommandWithForcedOnboarding("account")).resolves.toEqual(["account"]);
});

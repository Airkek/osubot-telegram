import assert from "node:assert/strict";
import test from "node:test";
import { ApplicationRuntime, RuntimeDependencies } from "../src/core/ApplicationRuntime";
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
        senderId: 1,
        chatId: 2,
        isInGroupChat: false,
        ensureUserInfoUpdated: async () => calls.push("context"),
        checkFeature: async () => false,
    } as never);

    assert.equal(factoryRuntime, runtime);
    assert.deepEqual(calls, ["database", "ignored", "api", "context", "stats", "command"]);
});

test("completed callbacks are removed from the shared runtime", async () => {
    const runtime = new ApplicationRuntime(createDependencies());
    await runtime.initialize();
    let callbackRuns = 0;
    const context = {
        senderId: 1,
        chatId: 2,
        isInGroupChat: false,
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

    assert.equal(callbackRuns, 1);
});

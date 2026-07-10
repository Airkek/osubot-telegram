import assert from "node:assert/strict";
import test from "node:test";
import { createTelegramWebhookIngress } from "../src/Telegram/WebhookIngress";
import { WebhookUpdateDispatcher } from "../src/Telegram/UpdateDispatcher";

global.logger = {
    error() {},
} as typeof global.logger;

const nextTurn = () => new Promise<void>((resolve) => setImmediate(resolve));

test("webhook ingress authenticates, validates and applies backpressure", () => {
    const invoke = (secret: string, body: unknown, accept = true) => {
        const result: { status?: number; body?: unknown; headers: Record<string, string> } = { headers: {} };
        let queued: unknown;
        const request = {
            get: () => secret,
            body,
        };
        const response = {
            status(code: number) {
                result.status = code;
                return this;
            },
            send(responseBody: unknown) {
                result.body = responseBody;
                return this;
            },
            sendStatus(code: number) {
                result.status = code;
                return this;
            },
            setHeader(key: string, value: string) {
                result.headers[key] = value;
            },
        };
        createTelegramWebhookIngress("good", (update) => {
            queued = update;
            return accept;
        })(request as never, response as never, () => {});
        return { result, queued };
    };

    assert.equal(invoke("good", { update_id: 1 }).result.status, 200);
    assert.equal(invoke("bad", { update_id: 1 }).result.status, 401);
    assert.equal(invoke("good", {}).result.status, 400);
    const full = invoke("good", { update_id: 2 }, false);
    assert.equal(full.result.status, 503);
    assert.equal(full.result.headers["Retry-After"], "1");
});

test("dispatcher defers work, limits concurrency and drains on stop", async () => {
    let active = 0;
    let maxActive = 0;
    const started: number[] = [];
    const releases: Array<() => void> = [];
    const dispatcher = new WebhookUpdateDispatcher<number>(
        async (task) => {
            started.push(task);
            active++;
            maxActive = Math.max(maxActive, active);
            await new Promise<void>((resolve) => {
                releases.push(() => {
                    active--;
                    resolve();
                });
            });
        },
        async () => {},
        2,
        3
    );

    assert.equal(dispatcher.enqueue(1), true);
    assert.equal(dispatcher.enqueue(2), true);
    assert.equal(dispatcher.enqueue(3), true);
    assert.equal(dispatcher.enqueue(4), false);
    assert.deepEqual(started, []);

    await nextTurn();
    assert.deepEqual(started, [1, 2]);
    assert.equal(maxActive, 2);

    releases.shift()();
    await nextTurn();
    await nextTurn();
    assert.deepEqual(started, [1, 2, 3]);
    assert.equal(maxActive, 2);

    const stopped = dispatcher.stop();
    while (releases.length > 0) {
        releases.shift()();
    }
    await stopped;
});

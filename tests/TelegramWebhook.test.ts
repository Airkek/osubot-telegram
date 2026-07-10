import { expect, test } from "@jest/globals";
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

    expect(invoke("good", { update_id: 1 }).result.status).toBe(200);
    expect(invoke("bad", { update_id: 1 }).result.status).toBe(401);
    expect(invoke("good", {}).result.status).toBe(400);
    const full = invoke("good", { update_id: 2 }, false);
    expect(full.result.status).toBe(503);
    expect(full.result.headers["Retry-After"]).toBe("1");
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

    expect(dispatcher.enqueue(1)).toBe(true);
    expect(dispatcher.enqueue(2)).toBe(true);
    expect(dispatcher.enqueue(3)).toBe(true);
    expect(dispatcher.enqueue(4)).toBe(false);
    expect(started).toEqual([]);

    await nextTurn();
    expect(started).toEqual([1, 2]);
    expect(maxActive).toBe(2);

    releases.shift()();
    await nextTurn();
    await nextTurn();
    expect(started).toEqual([1, 2, 3]);
    expect(maxActive).toBe(2);

    const stopped = dispatcher.stop();
    while (releases.length > 0) {
        releases.shift()();
    }
    await stopped;
});

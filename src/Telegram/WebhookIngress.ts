import { Update } from "@grammyjs/types";
import { RequestHandler } from "express";
import { timingSafeEqual } from "node:crypto";

function secureStringEquals(supplied: string, expected: string): boolean {
    const suppliedBuffer = Buffer.from(supplied);
    const expectedBuffer = Buffer.from(expected);
    return suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer);
}

export function createTelegramWebhookIngress(secret: string, enqueue: (update: Update) => boolean): RequestHandler {
    return (req, res) => {
        const suppliedSecret = req.get("X-Telegram-Bot-Api-Secret-Token") || "";
        if (!secureStringEquals(suppliedSecret, secret)) {
            res.status(401).send("Unauthorized");
            return;
        }

        const update = req.body as Update;
        if (!update || !Number.isSafeInteger(update.update_id)) {
            res.status(400).send("Invalid Telegram update");
            return;
        }

        if (!enqueue(update)) {
            res.setHeader("Retry-After", "1");
            res.status(503).send("Webhook update queue is full");
            return;
        }

        res.sendStatus(200);
    };
}

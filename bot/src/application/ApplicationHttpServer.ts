import express, { Express, Request, Response } from "express";
import { Server } from "node:http";
import { InlineCardStore } from "application/InlineCardStore";

export class ApplicationHttpServer {
    readonly app: Express;
    private server?: Server;

    constructor() {
        this.app = express();
        this.app.use(express.json());
        this.app.get("/health", (_req: Request, res: Response) => {
            return res.status(200).json({
                status: "UP",
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                message: "Service is running",
            });
        });
    }

    /**
     * Serves rendered inline cards. Only the Bot API server fetches these, so
     * the route stays unauthenticated but the ids are unguessable and expire.
     */
    registerInlineCards(store: InlineCardStore): void {
        this.app.get("/inline-cards/:id.png", (req: Request, res: Response) => {
            const card = store.get(req.params.id);
            if (!card) {
                return res.status(404).end();
            }
            res.setHeader("Content-Type", "image/png");
            res.setHeader("Cache-Control", "no-store");
            return res.status(200).end(card);
        });
    }

    start(): void {
        if (this.server) {
            return;
        }
        const port = Number(process.env.APP_PORT);
        if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
            throw new Error("APP_PORT must be an integer between 1 and 65535");
        }
        const host = process.env.APP_HOST || "0.0.0.0";
        this.server = this.app.listen(port, host, () => {
            global.logger.info(`Listening on ${host}:${port}`);
        });
    }

    async stop(): Promise<void> {
        if (!this.server) {
            return;
        }
        const server = this.server;
        this.server = undefined;
        await new Promise<void>((resolve, reject) => {
            server.close((error) => (error ? reject(error) : resolve()));
        });
    }
}

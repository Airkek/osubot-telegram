import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { randomUUID } from "node:crypto";

interface WorkerError {
    type: string;
    message: string;
}

interface WorkerResponse<TResult> {
    id: string;
    result?: TResult;
    error?: WorkerError;
}

interface PendingRequest {
    resolve(result: unknown): void;
    reject(error: Error): void;
    timeout: NodeJS.Timeout;
}

const REQUEST_TIMEOUT_MS = 30_000;

class OfficialCalculatorClient {
    private process?: ChildProcessWithoutNullStreams;
    private readonly pending = new Map<string, PendingRequest>();

    async request<TResult>(payload: Record<string, unknown>): Promise<TResult> {
        const child = this.ensureProcess();
        const id = randomUUID();

        return await new Promise<TResult>((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error(`Official osu! calculator timed out after ${REQUEST_TIMEOUT_MS}ms`));
            }, REQUEST_TIMEOUT_MS);
            timeout.unref();
            this.pending.set(id, {
                resolve: resolve as (result: unknown) => void,
                reject,
                timeout,
            });

            child.stdin.write(`${JSON.stringify({ id, ...payload })}\n`, (error) => {
                if (!error) {
                    return;
                }
                const pending = this.pending.get(id);
                if (!pending) {
                    return;
                }
                clearTimeout(pending.timeout);
                this.pending.delete(id);
                pending.reject(error);
            });
        });
    }

    stop(): void {
        this.process?.kill();
        this.process = undefined;
        this.rejectPending(new Error("Official osu! calculator stopped"));
    }

    private ensureProcess(): ChildProcessWithoutNullStreams {
        if (this.process && !this.process.killed) {
            return this.process;
        }

        const configuredPath = process.env.OSU_PERFORMANCE_WORKER_PATH?.trim();
        const workerPath = path.resolve(
            configuredPath || path.join("build", "osu-performance", "OsuPerformanceWorker.dll")
        );
        if (!fs.existsSync(workerPath)) {
            throw new Error(`Official osu! calculator was not built: ${workerPath}`);
        }

        const isDll = path.extname(workerPath).toLowerCase() === ".dll";
        const child = spawn(isDll ? "dotnet" : workerPath, isDll ? [workerPath] : [], {
            stdio: ["pipe", "pipe", "pipe"],
            windowsHide: true,
        });
        this.process = child;

        const lines = readline.createInterface({ input: child.stdout });
        lines.on("line", (line) => this.handleResponse(line));
        child.stderr.setEncoding("utf8");
        child.stderr.on("data", (data: string) => {
            const message = data.trim();
            if (message) {
                global.logger.error(`Official osu! calculator: ${message}`);
            }
        });
        child.once("error", (error) => this.handleExit(error));
        child.once("exit", (code, signal) => {
            this.handleExit(new Error(`Official osu! calculator exited (code=${code}, signal=${signal})`));
        });
        return child;
    }

    private handleResponse(line: string): void {
        let response: WorkerResponse<unknown>;
        try {
            response = JSON.parse(line) as WorkerResponse<unknown>;
        } catch (error) {
            global.logger.error("Official osu! calculator returned invalid JSON", error, line);
            return;
        }

        const pending = this.pending.get(response.id);
        if (!pending) {
            return;
        }
        clearTimeout(pending.timeout);
        this.pending.delete(response.id);
        if (response.error) {
            pending.reject(new Error(`${response.error.type}: ${response.error.message}`));
        } else {
            pending.resolve(response.result);
        }
    }

    private handleExit(error: Error): void {
        this.process = undefined;
        this.rejectPending(error);
    }

    private rejectPending(error: Error): void {
        for (const pending of this.pending.values()) {
            clearTimeout(pending.timeout);
            pending.reject(error);
        }
        this.pending.clear();
    }
}

export default new OfficialCalculatorClient();

import { setImmediate } from "node:timers";

type TaskHandler<T> = (task: T) => Promise<void>;
type ErrorHandler<T> = (error: unknown, task: T) => void | Promise<void>;

export class WebhookUpdateDispatcher<T> {
    private readonly queue: T[] = [];
    private activeTasks = 0;
    private drainScheduled = false;
    private acceptingTasks = true;
    private idlePromise?: Promise<void>;
    private resolveIdle?: () => void;

    constructor(
        private readonly handleTask: TaskHandler<T>,
        private readonly handleError: ErrorHandler<T>,
        private readonly concurrency: number,
        private readonly capacity: number
    ) {
        if (!Number.isInteger(concurrency) || concurrency < 1) {
            throw new Error("Webhook update concurrency must be a positive integer");
        }
        if (!Number.isInteger(capacity) || capacity < concurrency) {
            throw new Error("Webhook update queue capacity must be an integer no smaller than concurrency");
        }
    }

    enqueue(task: T): boolean {
        if (!this.acceptingTasks || this.size >= this.capacity) {
            return false;
        }

        this.queue.push(task);
        this.scheduleDrain();
        return true;
    }

    get size(): number {
        return this.activeTasks + this.queue.length;
    }

    async stop(): Promise<void> {
        this.acceptingTasks = false;
        if (this.size === 0) {
            return;
        }

        if (!this.idlePromise) {
            this.idlePromise = new Promise((resolve) => {
                this.resolveIdle = resolve;
            });
        }
        await this.idlePromise;
    }

    private scheduleDrain(): void {
        if (this.drainScheduled || this.activeTasks >= this.concurrency || this.queue.length === 0) {
            return;
        }

        this.drainScheduled = true;
        setImmediate(() => {
            this.drainScheduled = false;
            this.drain();
        });
    }

    private drain(): void {
        while (this.activeTasks < this.concurrency && this.queue.length > 0) {
            const task = this.queue.shift();
            this.activeTasks++;
            void this.process(task);
        }
    }

    private async process(task: T): Promise<void> {
        try {
            await this.handleTask(task);
        } catch (error) {
            try {
                await this.handleError(error, task);
            } catch (handlerError) {
                global.logger.error("Webhook update error handler failed", handlerError, error);
            }
        } finally {
            this.activeTasks--;
            this.scheduleDrain();
            if (this.size === 0 && this.resolveIdle) {
                this.resolveIdle();
                this.resolveIdle = undefined;
                this.idlePromise = undefined;
            }
        }
    }
}

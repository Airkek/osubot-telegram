import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "node:path";

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_MESSAGE_SIZE = 64 * 1024 * 1024;

type PerformanceMethod = "health" | "calculateBeatmap" | "calculatePerformance" | "readReplayHeader" | "decodeReplay";

type UnaryMethod = (
    request: object,
    options: grpc.CallOptions,
    callback: (error: grpc.ServiceError | null, response: unknown) => void
) => grpc.ClientUnaryCall;

interface PerformanceServiceClient extends grpc.Client {
    health: UnaryMethod;
    calculateBeatmap: UnaryMethod;
    calculatePerformance: UnaryMethod;
    readReplayHeader: UnaryMethod;
    decodeReplay: UnaryMethod;
}

interface PerformancePackage {
    osubot: {
        performance: {
            v1: {
                PerformanceService: grpc.ServiceClientConstructor;
            };
        };
    };
}

const contractPath = path.resolve(
    __dirname,
    "..",
    "..",
    "contracts",
    "osubot",
    "performance",
    "v1",
    "performance.proto"
);
const packageDefinition = protoLoader.loadSync(contractPath, {
    defaults: true,
    enums: String,
    keepCase: true,
    longs: Number,
    oneofs: true,
});
const performancePackage = grpc.loadPackageDefinition(packageDefinition) as unknown as PerformancePackage;

export class PerformanceClient {
    private client?: PerformanceServiceClient;

    async health(): Promise<{ status: string; version: string }> {
        return await this.request("health", {});
    }

    async request<TResult>(methodName: PerformanceMethod, payload: object): Promise<TResult> {
        const client = this.getClient();
        const method = client[methodName];
        const deadline = Date.now() + REQUEST_TIMEOUT_MS;
        return await new Promise<TResult>((resolve, reject) => {
            method.call(client, payload, { deadline }, (error, response) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(response as TResult);
            });
        });
    }

    close(): void {
        this.client?.close();
        this.client = undefined;
    }

    private getClient(): PerformanceServiceClient {
        if (this.client) {
            return this.client;
        }
        const address = process.env.OSU_PERFORMANCE_SERVER_ADDRESS?.trim() || "performance-server:50051";
        this.client = new performancePackage.osubot.performance.v1.PerformanceService(
            address,
            grpc.credentials.createInsecure(),
            {
                "grpc.max_receive_message_length": MAX_MESSAGE_SIZE,
                "grpc.max_send_message_length": MAX_MESSAGE_SIZE,
            }
        ) as unknown as PerformanceServiceClient;
        return this.client;
    }
}

export default new PerformanceClient();

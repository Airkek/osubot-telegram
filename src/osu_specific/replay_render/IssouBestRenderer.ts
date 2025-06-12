import { IReplayRenderer, RenderResponse, RenderSettings, Video } from "./IReplayRenderer";
import FormData from "form-data";
import axios from "axios";
import { io, Socket } from "socket.io-client";
import Util from "../../Util";

interface UploadResponse {
    success: boolean;
    renderId?: number;
    error?: string;
}

interface Metadata {
    resolution: string;
    duration: number;
}

class OrdinalWebSocket {
    private static instance: OrdinalWebSocket;
    private socket: Socket | null = null;
    private pendingRenders: Map<
        number,
        { resolve: () => void; reject: (reason: string) => void; timeout: NodeJS.Timeout }
    > = new Map();

    private constructor() {
        this.connect();
    }

    public static getInstance(): OrdinalWebSocket {
        if (!OrdinalWebSocket.instance) {
            OrdinalWebSocket.instance = new OrdinalWebSocket();
        }
        return OrdinalWebSocket.instance;
    }

    private connect() {
        this.socket = io("https://apis.issou.best", {
            path: "/ordr/ws",
            transports: ["websocket"],
            reconnection: true,
            reconnectionDelay: 5000,
        });

        this.socket.on("render_done_json", (data: { renderID: number }) => {
            const pending = this.pendingRenders.get(data.renderID);
            if (pending) {
                clearTimeout(pending.timeout);
                pending.resolve();
                this.pendingRenders.delete(data.renderID);
            }
        });

        this.socket.on("render_failed_json", (data: { renderID: number; errorMessage: string }) => {
            const pending = this.pendingRenders.get(data.renderID);
            if (pending) {
                clearTimeout(pending.timeout);
                pending.reject(data.errorMessage);
                this.pendingRenders.delete(data.renderID);
            }
        });

        this.socket.on("connect_error", (err) => {
            global.logger.error("o!rdr WebSocket connection error:", err.message);
        });
    }

    public waitForRenderCompletion(renderId: number, timeoutMs: number = 300000): Promise<void> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingRenders.delete(renderId);
                reject(`Timeout after ${timeoutMs}ms waiting for render ${renderId}`);
            }, timeoutMs);

            this.pendingRenders.set(renderId, { resolve, reject, timeout });
        });
    }
}

export class IssouBestRenderer implements IReplayRenderer {
    private readonly wsClient: OrdinalWebSocket;

    constructor() {
        this.wsClient = OrdinalWebSocket.getInstance();
    }

    public async available(): Promise<boolean> {
        return true; // TODO
    }

    public supportGameMode(mode: number): boolean {
        return mode == 0; // osu!
    }

    async render(file: Buffer, settings: RenderSettings): Promise<RenderResponse> {
        const timer = Util.timer();
        const uploadResponse = await this.uploadReplay(file, settings);

        if (!uploadResponse.success) {
            global.logger.info(`Render worker: render upload failed in ${timer.ms} (${uploadResponse.error})`);
            return {
                success: false,
                error: uploadResponse.error,
            };
        }

        global.logger.info(`Render worker: render started (upload took ${timer.ms})`);
        try {
            await this.wsClient.waitForRenderCompletion(uploadResponse.renderId!);
        } catch (error) {
            global.logger.info(`Render worker: render failed in ${timer.ms} (${error})`);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }

        const meta = await this.fetchRenderMetadata(uploadResponse.renderId!);
        const url = await this.getVideoUrl(uploadResponse.renderId!);

        const video: Video = {
            url,
            duration: meta.duration,
            width: 1280,
            heigth: 720,
        };

        const resSplit = meta.resolution?.split("x");
        if (resSplit?.length === 2) {
            video.width = parseInt(resSplit[0], 10);
            video.heigth = parseInt(resSplit[1], 10);
        }

        global.logger.info(`Render worker: render done in ${timer.ms}`);

        return {
            success: true,
            video,
        };
    }

    private async uploadReplay(file: Buffer, settings: RenderSettings): Promise<UploadResponse> {
        const form = new FormData();
        form.append("replayFile", file, { filename: "replay.osr" });

        form.append("username", process.env.ORDR_USERNAME);
        form.append("verificationKey", process.env.ORDR_API_KEY);

        form.append("showDanserLogo", "false");
        form.append("useSkinColors", "true");
        form.append("useSkinHitsounds", "true");
        form.append("useBeatmapColors", "false");
        form.append("resolution", "1280x720");
        form.append("skip", "true");

        form.append("loadVideo", settings.video ? "true" : "false");
        form.append("loadStoryboard", settings.storyboard ? "true" : "false");
        form.append("showPPCounter", settings.pp_counter ? "true" : "false");
        form.append("showUnstableRate", settings.ur_counter ? "true" : "false");
        form.append("showHitCounter", settings.hit_counter ? "true" : "false");
        form.append("showStrainGraph", settings.strain_graph ? "true" : "false");
        form.append("customSkin", settings.isSkinCustom ? "true" : "false");
        form.append("inGameBGDim", settings.dim.toString());
        form.append("skin", settings.skin.toString());

        try {
            const { data } = await axios.post("https://apis.issou.best/ordr/renders", form, {
                headers: form.getHeaders(),
            });

            return {
                success: true,
                renderId: data.renderID,
            };
        } catch (err) {
            return {
                success: false,
                error: err.response?.data?.message || err.message,
            };
        }
    }

    private async fetchRenderMetadata(renderId: number): Promise<Metadata> {
        const { data } = await axios.get(`https://apis.issou.best/ordr/renders?renderID=${renderId}`);

        if (!data.renders?.[0]) {
            throw new Error("Render metadata not found");
        }

        return {
            duration: data.renders[0].mapLength,
            resolution: data.renders[0].resolution,
        };
    }

    private async getVideoUrl(renderId: number): Promise<string> {
        const { data } = await axios.get(`https://apis.issou.best/dynlink/ordr/gen?id=${renderId}`);
        return data.url;
    }
}

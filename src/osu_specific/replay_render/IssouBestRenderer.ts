import { IReplayRenderer, RenderResponse } from "./IReplayRenderer";
import FormData from "form-data";
import axios from "axios";

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

interface UploadResponse {
    success: boolean;
    renderId?: number;
    error?: string;
}

export class IssouBestRenderer implements IReplayRenderer {
    constructor() {}

    async render(file: Buffer): Promise<RenderResponse> {
        const uploadResponse = await this.uploadReplay(file);

        if (!uploadResponse.success) {
            return {
                success: false,
                error: uploadResponse.error,
            };
        }

        await this.waitUntilDone(uploadResponse.renderId);
        const url = await this.getVideoUrl(uploadResponse.renderId);

        return {
            success: true,
            video_url: url,
        };
    }

    private async uploadReplay(file: Buffer): Promise<UploadResponse> {
        const form = new FormData();
        form.append("replayFile", file, { filename: "replay.osr" });
        form.append("showDanserLogo", "false");
        form.append("skin", "61");
        form.append("resolution", "1280x720");
        form.append("username", process.env.ORDR_USERNAME);
        form.append("verificationKey", process.env.ORDR_API_KEY);
        form.append("loadVideo", "true");
        form.append("loadStoryboard", "true");
        form.append("skip", "true");
        form.append("showPPCounter", "true");
        form.append("showUnstableRate", "false");

        try {
            const { data } = await axios.post("https://apis.issou.best/ordr/renders", form, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            return {
                success: true,
                renderId: data.renderID,
            };
        } catch (err) {
            const data = err.response.data;
            return {
                success: false,
                error: data.message,
            };
        }
    }

    private async waitUntilDone(render_id: number): Promise<void> {
        let isDone = false;
        do {
            const response = await axios.get(`https://apis.issou.best/ordr/renders?renderID=${render_id}`);
            isDone = response.data.renders[0].progress === "Done.";
            await delay(5000);
        } while (!isDone);
    }

    private async getVideoUrl(render_id: number): Promise<string> {
        const { data } = await axios.get(`https://apis.issou.best/dynlink/ordr/gen?id=${render_id}`);
        return data.url;
    }
}

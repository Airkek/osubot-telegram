import { IReplayRenderer, RenderResponse, RenderSettings, Video } from "./IReplayRenderer";
import FormData from "form-data";
import axios from "axios";
import Util from "../../Util";

interface UploadResponse {
    success: boolean;
    renderId?: number;
    error?: string;
}

const sleep = async (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

export class ExperimentalRenderer implements IReplayRenderer {
    private readonly base_url: string;

    constructor() {
        this.base_url = process.env.EXPERIMENTAL_RENDERER_BASE_URL;
    }

    public supportGameMode(mode: number): boolean {
        return [0, 1, 2, 3].includes(mode); // osu!, taiko, fruits, mania
    }

    public async available(): Promise<boolean> {
        if (this.base_url == "disabled") {
            return false;
        }

        try {
            const { data } = await axios.get(`${this.base_url}/available`);
            return data.trim() == "1";
        } catch {
            return false;
        }
    }

    async render(file: Buffer, settings: RenderSettings): Promise<RenderResponse> {
        const timer = Util.timer();
        const uploadResponse = await this.uploadReplay(file, settings);

        if (!uploadResponse.success) {
            global.logger.info(
                `Experimental render worker: render upload failed in ${timer.ms} (${uploadResponse.error})`
            );
            return {
                success: false,
                error: uploadResponse.error,
            };
        }

        global.logger.info(`Experimental render worker: render started (upload took ${timer.ms})`);
        try {
            await this.waitForRenderCompletion(uploadResponse.renderId);
        } catch (error) {
            global.logger.info(`Experimental render worker: render failed in ${timer.ms} (${error})`);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }

        const url = `${this.base_url}/renders/${uploadResponse.renderId}`;

        const video: Video = {
            url,
            duration: 60,
            width: 1280,
            heigth: 720,
        };

        global.logger.info(`Experimental render worker: render done in ${timer.ms}`);

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
            const { data } = await axios.post(`${this.base_url}/renders`, form, {
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

    private async waitForRenderCompletion(renderId: number): Promise<void> {
        while (true) {
            const { data } = await axios.get(`${this.base_url}/status/${renderId}`);

            const status = data.split("\n");

            if (status[0] == "render") {
                await sleep(500);
                continue;
            }

            if (status[0] == "fail") {
                throw status[1];
            }
            if (status[0] == "done") {
                return;
            }

            throw `Unknown error: ${data}`;
        }
    }
}

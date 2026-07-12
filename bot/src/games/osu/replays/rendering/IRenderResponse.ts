import { IVideo } from "games/osu/replays/rendering/IVideo";

export interface IRenderResponse {
    success: boolean;
    video?: IVideo;
    error?: string;
}

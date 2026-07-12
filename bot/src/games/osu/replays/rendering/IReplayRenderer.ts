import { IRenderResponse } from "games/osu/replays/rendering/IRenderResponse";
import { IRenderSettings } from "games/osu/replays/rendering/IRenderSettings";

export interface IReplayRenderer {
    render(file: Buffer, settings: IRenderSettings): Promise<IRenderResponse>;
    available(): Promise<boolean>;
    supportGameMode(mode: number): boolean;
}

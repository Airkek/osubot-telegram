import IAPI from "./base";

import GatariAPI from "./Gatari";
import RippleAPI from "./Ripple";
import AkatsukiAPI from "./Akatsuki";
import AkatsukiRelaxAPI from "./AkatsukiRelax";
import AkatsukiAutopilotAPI from "./AkatsukiAutopilot";
import BanchoAPIV2 from "./BanchoV2";
import BeatLeaderAPI from "./BeatLeader";
import ScoreSaberAPI from "./ScoreSaber";
import { IBeatmapProvider } from "../beatmaps/IBeatmapProvider";
import RippleRelaxAPI from "./RippleRelax";

class APICollection {
    bancho: IAPI;
    gatari: IAPI;
    ripple: IAPI;
    rippleRx: IAPI;
    akatsuki: IAPI;
    akatsukiRx: IAPI;
    akatsukiAp: IAPI;
    beatleader: IAPI;
    scoresaber: IAPI;
    constructor(bancho: BanchoAPIV2, osuBeatmapProvider: IBeatmapProvider) {
        this.bancho = bancho;
        this.gatari = new GatariAPI(osuBeatmapProvider);
        this.ripple = new RippleAPI();
        this.rippleRx = new RippleRelaxAPI();
        this.akatsuki = new AkatsukiAPI();
        this.akatsukiRx = new AkatsukiRelaxAPI();
        this.akatsukiAp = new AkatsukiAutopilotAPI();
        this.beatleader = new BeatLeaderAPI();
        this.scoresaber = new ScoreSaberAPI();
    }
}

export { APICollection };

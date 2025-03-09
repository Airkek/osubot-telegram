import IAPI from "./base";

import GatariAPI from "./Gatari";
import RippleAPI from "./Ripple";
import AkatsukiAPI from "./Akatsuki";
import AkatsukiRelaxAPI from "./AkatsukiRelax";
import BanchoAPIV2 from "./BanchoV2";
import BeatLeaderAPI from "./BeatLeader";
import ScoreSaberAPI from "./ScoreSaber";
import { IBeatmapProvider } from "../beatmaps/IBeatmapProvider";

class APICollection {
    bancho: IAPI;
    gatari: IAPI;
    ripple: IAPI;
    akatsuki: IAPI;
    relax: IAPI;
    beatleader: IAPI;
    scoresaber: IAPI;
    constructor(bancho: BanchoAPIV2, osuBeatmapProvider: IBeatmapProvider) {
        this.bancho = bancho;
        this.gatari = new GatariAPI(osuBeatmapProvider);
        this.ripple = new RippleAPI(osuBeatmapProvider);
        this.akatsuki = new AkatsukiAPI();
        this.relax = new AkatsukiRelaxAPI();
        this.beatleader = new BeatLeaderAPI();
        this.scoresaber = new ScoreSaberAPI();
    }
}

export { APICollection };

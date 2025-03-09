import IAPI from "./api/base";

import GatariAPI from "./api/Gatari";
import RippleAPI from "./api/Ripple";
import AkatsukiAPI from "./api/Akatsuki";
import AkatsukiRelaxAPI from "./api/AkatsukiRelax";
import BanchoAPIV2 from "./api/BanchoV2";
import BeatLeaderAPI from "./api/BeatLeader";
import ScoreSaberAPI from "./api/ScoreSaber";
import { IBeatmapProvider } from "./beatmaps/IBeatmapProvider";

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

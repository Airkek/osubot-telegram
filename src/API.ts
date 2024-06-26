import { Bot } from "./Bot"
import IAPI from './api/base';

import BanchoAPI from './api/Bancho';
import GatariAPI from './api/Gatari';
import RippleAPI from './api/Ripple';
import AkatsukiAPI from './api/Akatsuki';
import AkatsukiRelaxAPI from './api/AkatsukiRelax';
import BanchoAPIV2 from "./api/BanchoV2";
import BeatLeaderAPI from "./api/BeatLeader";
import ScoreSaberAPI from "./api/ScoreSaber";

class APICollection {
    bancho: BanchoAPI;
    gatari: GatariAPI;
    ripple: RippleAPI;
    akatsuki: AkatsukiAPI;
    relax: AkatsukiRelaxAPI;
    v2: BanchoAPIV2;
    beatleader: BeatLeaderAPI;
    scoresaber: ScoreSaberAPI
    constructor(bot: Bot) {
        this.bancho = new BanchoAPI(bot);
        this.gatari = new GatariAPI(bot);
        this.ripple = new RippleAPI(bot);
        this.akatsuki = new AkatsukiAPI(bot);
        this.relax = new AkatsukiRelaxAPI(bot);
        this.v2 = new BanchoAPIV2(bot);
        this.beatleader = new BeatLeaderAPI(bot);
        this.scoresaber = new ScoreSaberAPI(bot);
    }
}

export {
    IAPI,
    APICollection
}
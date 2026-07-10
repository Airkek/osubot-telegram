import GatariAPI from "./Gatari";
import RippleAPI from "./Ripple";
import AkatsukiAPI from "./Akatsuki";
import AkatsukiRelaxAPI from "./AkatsukiRelax";
import AkatsukiAutopilotAPI from "./AkatsukiAutopilot";
import BanchoAPIV2 from "./BanchoV2";
import BeatLeaderAPI from "./BeatLeader";
import ScoreSaberAPI from "./ScoreSaber";
import RippleRelaxAPI from "./RippleRelax";

class APICollection {
    readonly bancho: BanchoAPIV2;
    readonly gatari: GatariAPI;
    readonly ripple: RippleAPI;
    readonly rippleRx: RippleRelaxAPI;
    readonly akatsuki: AkatsukiAPI;
    readonly akatsukiRx: AkatsukiRelaxAPI;
    readonly akatsukiAp: AkatsukiAutopilotAPI;
    readonly beatleader: BeatLeaderAPI;
    readonly scoresaber: ScoreSaberAPI;
    constructor(bancho: BanchoAPIV2) {
        this.bancho = bancho;
        this.gatari = new GatariAPI();
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

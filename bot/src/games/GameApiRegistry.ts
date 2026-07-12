import { GatariApiClient } from "games/osu/server/ripple_based/gatari/GatariApiClient";
import { RippleApiClient } from "games/osu/server/ripple_based/ripple/RippleApiClient";
import { AkatsukiApiClient } from "games/osu/server/ripple_based/Akatsuki/AkatsukiApiClient";
import { AkatsukiRelaxApiClient } from "games/osu/server/ripple_based/Akatsuki/AkatsukiRelaxApiClient";
import { AkatsukiAutopilotApiClient } from "games/osu/server/ripple_based/Akatsuki/AkatsukiAutopilotApiClient";
import { BanchoV2ApiClient } from "games/osu/server/bancho/BanchoV2ApiClient";
import { BeatLeaderApiClient } from "games/beatsaber/api/BeatLeaderApiClient";
import { ScoreSaberApiClient } from "games/beatsaber/api/ScoreSaberApiClient";
import { RippleRelaxApiClient } from "games/osu/server/ripple_based/ripple/RippleRelaxApiClient";

class GameApiRegistry {
    readonly bancho: BanchoV2ApiClient;
    readonly gatari: GatariApiClient;
    readonly ripple: RippleApiClient;
    readonly rippleRx: RippleRelaxApiClient;
    readonly akatsuki: AkatsukiApiClient;
    readonly akatsukiRx: AkatsukiRelaxApiClient;
    readonly akatsukiAp: AkatsukiAutopilotApiClient;
    readonly beatleader: BeatLeaderApiClient;
    readonly scoresaber: ScoreSaberApiClient;
    constructor(bancho: BanchoV2ApiClient) {
        this.bancho = bancho;
        this.gatari = new GatariApiClient();
        this.ripple = new RippleApiClient();
        this.rippleRx = new RippleRelaxApiClient();
        this.akatsuki = new AkatsukiApiClient();
        this.akatsukiRx = new AkatsukiRelaxApiClient();
        this.akatsukiAp = new AkatsukiAutopilotApiClient();
        this.beatleader = new BeatLeaderApiClient();
        this.scoresaber = new ScoreSaberApiClient();
    }
}

export { GameApiRegistry };

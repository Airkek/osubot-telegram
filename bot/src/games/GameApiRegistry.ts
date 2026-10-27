import { GatariApiClient } from "games/osu/server/ripple_based/gatari/GatariApiClient";
import { RippleApiClient } from "games/osu/server/ripple_based/ripple/RippleApiClient";
import { AkatsukiApiClient } from "games/osu/server/ripple_based/Akatsuki/AkatsukiApiClient";
import { AkatsukiRelaxApiClient } from "games/osu/server/ripple_based/Akatsuki/AkatsukiRelaxApiClient";
import { AkatsukiAutopilotApiClient } from "games/osu/server/ripple_based/Akatsuki/AkatsukiAutopilotApiClient";
import { BanchoV2ApiClient } from "games/osu/server/bancho/BanchoV2ApiClient";
import { BeatLeaderApiClient } from "games/beatsaber/api/BeatLeaderApiClient";
import { ScoreSaberApiClient } from "games/beatsaber/api/ScoreSaberApiClient";
import { RippleRelaxApiClient } from "games/osu/server/ripple_based/ripple/RippleRelaxApiClient";

import { MorasoomaApiClient } from "games/osu/server/morasooma/MorasoomaApiClient";
import { IApiCredentials } from "games/IApiCredentials";

class GameApiRegistry {
    readonly morasooma?: MorasoomaApiClient;
    readonly bancho: BanchoV2ApiClient;
    readonly gatari: GatariApiClient;
    readonly ripple: RippleApiClient;
    readonly rippleRx: RippleRelaxApiClient;
    readonly akatsuki: AkatsukiApiClient;
    readonly akatsukiRx: AkatsukiRelaxApiClient;
    readonly akatsukiAp: AkatsukiAutopilotApiClient;
    readonly beatleader: BeatLeaderApiClient;
    readonly scoresaber: ScoreSaberApiClient;
    constructor(credentials: IApiCredentials) {
        this.bancho = new BanchoV2ApiClient(credentials.banchoClientId, credentials.banchoClientSecret);
        if (
            Number.isSafeInteger(credentials.morasoomaClientId) &&
            credentials.morasoomaClientId > 0 &&
            credentials.morasoomaClientSecret?.trim()
        ) {
            this.morasooma = new MorasoomaApiClient(credentials.morasoomaClientId, credentials.morasoomaClientSecret);
        }
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

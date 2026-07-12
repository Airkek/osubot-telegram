import { AkatsukiApiClient } from "games/osu/server/ripple_based/Akatsuki/AkatsukiApiClient";

export class AkatsukiRelaxApiClient extends AkatsukiApiClient {
    protected override get statsIndex(): number {
        return 1;
    }

    protected override get rxValue(): number {
        return 1;
    }
}

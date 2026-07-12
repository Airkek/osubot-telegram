import { AkatsukiApiClient } from "games/osu/server/ripple_based/Akatsuki/AkatsukiApiClient";

export class AkatsukiAutopilotApiClient extends AkatsukiApiClient {
    protected override get statsIndex(): number {
        return 2;
    }

    protected override get rxValue(): number {
        return 2;
    }
}

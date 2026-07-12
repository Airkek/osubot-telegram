import { RippleApiClient } from "games/osu/server/ripple_based/ripple/RippleApiClient";

export class RippleRelaxApiClient extends RippleApiClient {
    protected override get statsIndex(): string {
        return "relax";
    }

    protected override get rxValue(): number {
        return 1;
    }
}

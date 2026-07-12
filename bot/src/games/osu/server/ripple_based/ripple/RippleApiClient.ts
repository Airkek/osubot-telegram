import { UniversalRippleApiClient } from "games/osu/server/ripple_based/UniversalRippleApiClient";

export class RippleApiClient extends UniversalRippleApiClient {
    protected override get avatarBase(): string {
        return "https://a.ripple.moe";
    }

    protected override get baseUrl(): string {
        return "https://ripple.moe";
    }

    protected override get statsIndex(): string {
        return "classic";
    }

    protected override get rxValue(): number {
        return 0;
    }

    protected override get rxKey(): string {
        return "relax";
    }
}

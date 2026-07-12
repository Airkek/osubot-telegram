import { UniversalRippleApiClient } from "games/osu/server/ripple_based/UniversalRippleApiClient";

export class AkatsukiApiClient extends UniversalRippleApiClient {
    protected override get avatarBase(): string {
        return "https://a.akatsuki.gg";
    }

    protected override get baseUrl(): string {
        return "https://akatsuki.gg";
    }

    protected override get statsIndex(): number {
        return 0;
    }

    protected override get rxKey(): string {
        return "rx";
    }

    protected override get rxValue(): number {
        return 0;
    }
}

import UnifiedRippleAPI from "./UnifiedRippleApi";

export default class AkatsukiAPI extends UnifiedRippleAPI {
    protected get avatarBase() {
        return "https://a.akatsuki.gg";
    }

    protected get baseUrl() {
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

import UnifiedRippleAPI from "./UnifiedRippleApi";

export default class RippleRelaxAPI extends UnifiedRippleAPI {
    protected override get statsIndex(): string {
        return "relax";
    }

    protected override get rxValue(): number {
        return 1;
    }
}

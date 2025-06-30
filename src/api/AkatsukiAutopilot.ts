import AkatsukiAPI from "./Akatsuki";

export default class AkatsukiAutopilotAPI extends AkatsukiAPI {
    protected override get statsIndex(): number {
        return 2;
    }

    protected override get rxValue() {
        return 2;
    }
}

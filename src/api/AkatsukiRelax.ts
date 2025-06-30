import AkatsukiAPI from "./Akatsuki";

export default class AkatsukiRelaxAPI extends AkatsukiAPI {
    protected override get statsIndex(): number {
        return 1;
    }

    protected override get rxValue(): number {
        return 1;
    }
}

import { ILocalizer } from "localization/ILocalizer";
import { IGameUser } from "games/users/IGameUser";
import { IProfileCardLabels } from "presentation/cards/satori/IProfileCardLabels";
import { OsuProfileCard } from "presentation/cards/satori/OsuProfileCard";
import { SatoriCardContext } from "presentation/cards/satori/SatoriCardContext";

const CARD_WIDTH = 1000;
const CARD_HEIGHT = 400;

// Ширины под 2x-рендер: больше смысла не имеет, меньше — мылит.
const BACKGROUND_WIDTH = CARD_WIDTH * 2;
const AVATAR_WIDTH = 220;

export class ProfileCardRenderer {
    constructor(private readonly context: SatoriCardContext) {}

    async render(user: IGameUser, l: ILocalizer, serverName: string): Promise<Buffer> {
        const [avatar, background] = await Promise.all([
            this.context.toDataUri(user.profileAvatarUrl, AVATAR_WIDTH),
            this.context.toDataUri(user.profileBackgroundUrl, BACKGROUND_WIDTH),
        ]);

        return await this.context.toPng(
            OsuProfileCard({ user, labels: this.labels(l), serverName, avatar, background }),
            CARD_WIDTH,
            CARD_HEIGHT
        );
    }

    private labels(l: ILocalizer): IProfileCardLabels {
        return {
            globalRank: l.tr("card-global-rank"),
            countryRank: l.tr("card-country-rank"),
            accuracy: l.tr("card-accuracy"),
            playcount: l.tr("card-playcount"),
            playtime: l.tr("card-playtime"),
            level: l.tr("card-level"),
            supporter: l.tr("card-supporter"),
            hour: l.tr("card-hour-short"),
            minute: l.tr("card-minute-short"),
        };
    }
}

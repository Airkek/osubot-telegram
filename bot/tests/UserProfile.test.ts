import { IGameUser } from "../src/games/users/IGameUser";
import { expect, test } from "@jest/globals";
import Canvas from "@napi-rs/canvas";
import { OkiCardsGenerator } from "../src/presentation/cards/OkiCardsGenerator";
import { formatUser } from "../src/presentation/templates/legacy-text/User";
import { ILocalizer } from "../src/localization/ILocalizer";

global.logger = {
    fatal() {},
} as typeof global.logger;

const localizer: ILocalizer = {
    tr: (key) => key,
};

const user: IGameUser = {
    id: 12017585,
    nickname: "keijia",
    playcount: 61043,
    playtime: 40992,
    pp: 6806,
    rank: { total: 41589, country: 4019 },
    country: "RU",
    accuracy: 98.19,
    level: 100,
    levelProgress: 22,
    mode: 0,
};

test("Bancho profile renders Ranked Play in text and expands the card", async () => {
    const rankedUser: IGameUser = {
        ...user,
        rankedPlay: {
            poolName: "RP: Season 0",
            rating: 1471,
            rank: 25215,
            plays: 8,
            wins: 3,
            provisional: true,
        },
    };

    const text = formatUser(localizer, rankedUser, "https://osu.ppy.sh");
    expect(text).toContain("player-ranked-play: #");
    expect(text).toContain("player-ranked-play-rating:");
    expect(text).toContain("*");

    const generator = new OkiCardsGenerator();
    const normalCard = await Canvas.loadImage(await generator.generateUserCard(user, localizer));
    const rankedCard = await Canvas.loadImage(await generator.generateUserCard(rankedUser, localizer));

    expect([normalCard.width, normalCard.height]).toEqual([1200, 624]);
    expect([rankedCard.width, rankedCard.height]).toEqual([1200, 816]);
});

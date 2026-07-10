import { expect, test } from "@jest/globals";
import Canvas from "@napi-rs/canvas";
import { APIUser } from "../src/Types";
import { OkiCardsGenerator } from "../src/oki-cards/OkiCardsGenerator";
import UserTemplate from "../src/event_handlers/templates/User";
import { ILocalisator } from "../src/ILocalisator";

global.logger = {
    fatal() {},
} as typeof global.logger;

const localisator: ILocalisator = {
    tr: (key) => key,
};

const user: APIUser = {
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
    const rankedUser: APIUser = {
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

    const text = UserTemplate(localisator, rankedUser, "https://osu.ppy.sh");
    expect(text).toContain("player-ranked-play: #");
    expect(text).toContain("player-ranked-play-rating:");
    expect(text).toContain("*");

    const generator = new OkiCardsGenerator();
    const normalCard = await Canvas.loadImage(await generator.generateUserCard(user, localisator));
    const rankedCard = await Canvas.loadImage(await generator.generateUserCard(rankedUser, localisator));

    expect([normalCard.width, normalCard.height]).toEqual([1200, 624]);
    expect([rankedCard.width, rankedCard.height]).toEqual([1200, 816]);
});

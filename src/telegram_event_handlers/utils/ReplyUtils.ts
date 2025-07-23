import { OkiCardsGenerator } from "../../oki-cards/OkiCardsGenerator";
import UnifiedMessageContext from "../../TelegramSupport";
import { APIScore, APIUser, PPArgs } from "../../Types";
import { InputFile } from "grammy";
import Calculator from "../../osu_specific/pp/bancho";
import { CoversModel } from "../../data/Models/CoversModel";
import { IBeatmap } from "../../beatmaps/BeatmapTypes";
import { ILocalisator } from "../../ILocalisator";
import { ITemplates } from "../templates";
import BanchoPP from "../../osu_specific/pp/bancho";
import Util from "../../Util";

export interface ReplyData {
    text: string;
    photo: string | InputFile;
}

export class ReplyUtils {
    private readonly cards: OkiCardsGenerator;
    private readonly templates: ITemplates;
    private readonly coversModel: CoversModel;
    constructor(cardsGenerator: OkiCardsGenerator, templates: ITemplates, coversModel: CoversModel) {
        this.cards = cardsGenerator;
        this.templates = templates;
        this.coversModel = coversModel;
    }

    async scoreData(
        l: ILocalisator,
        ctx: UnifiedMessageContext,
        score: APIScore,
        beatmap: IBeatmap,
        serverBase: string
    ): Promise<ReplyData> {
        let templateAddition = "";
        if (await ctx.preferCardsOutput()) {
            const card = await this.cards.generateScoreCard(score, beatmap, l);
            if (card) {
                const beatmapUrl = beatmap.url ?? `${serverBase}/b/${beatmap.id}`;
                return {
                    text: `${l.tr("score-beatmap-link")}: ${beatmapUrl}`,
                    photo: new InputFile(card),
                };
            }

            templateAddition = "\n\n" + l.tr("card-gen-failed");
        }
        const calculator = new Calculator(beatmap, score.mods);
        let cover: string;
        if (beatmap.coverUrl) {
            cover = await this.coversModel.getPhotoDoc(beatmap.coverUrl);
        } else {
            cover = await this.coversModel.getCover(beatmap.setId);
        }
        const message = this.templates.ScoreFull(l, score, beatmap, calculator, serverBase) + templateAddition;

        return {
            text: message,
            photo: cover,
        };
    }

    async userData(l: ILocalisator, ctx: UnifiedMessageContext, user: APIUser, serverBase: string) {
        let templateAddition = "";
        if (await ctx.preferCardsOutput()) {
            const card = await this.cards.generateUserCard(user, l);
            if (card) {
                return {
                    text: `${serverBase}/u/${user.id}`,
                    photo: new InputFile(card),
                };
            }
            templateAddition = "\n\n" + l.tr("card-gen-failed");
        }

        const message = this.templates.User(l, user, serverBase) + templateAddition;

        return {
            text: message,
            photo: undefined,
        };
    }

    async topScores(
        l: ILocalisator,
        ctx: UnifiedMessageContext,
        user: APIUser,
        scores: APIScore[],
        maps: IBeatmap[],
        serverBase: string,
        startNum
    ) {
        let templateAddition = "";
        if (await ctx.preferCardsOutput()) {
            const card = await this.cards.generateTopScoresCard(scores, maps, user, l);
            if (card) {
                return {
                    text: "",
                    photo: new InputFile(card),
                };
            }
            templateAddition = "\n\n" + l.tr("card-gen-failed");
        }
        const response = maps
            .map((map, i) => {
                const calc = new BanchoPP(map, scores[i].mods);
                return this.templates.TopScore(l, scores[i], map, startNum + i, calc, serverBase);
            })
            .join("\n");
        const message =
            `${l.tr("players-top-scores", {
                player_name: user.nickname,
            })} [${Util.profileModes[user.mode]}]:\n${response}` + templateAddition;

        return {
            text: message,
            photo: undefined,
        };
    }

    async beatmapPP(l: ILocalisator, ctx: UnifiedMessageContext, beatmap: IBeatmap, args: PPArgs) {
        let templateAddition = "";
        if (await ctx.preferCardsOutput()) {
            const photo = await this.cards.generateBeatmapPPCard(beatmap, l, args);

            if (photo) {
                const beatmapUrl = `https://osu.ppy.sh/b/${beatmap.id}`;
                return {
                    text: beatmapUrl,
                    photo: new InputFile(photo),
                };
            }

            templateAddition = "\n\n" + l.tr("card-gen-failed");
        }

        let cover: string;
        if (beatmap.coverUrl) {
            cover = await this.coversModel.getPhotoDoc(beatmap.coverUrl);
        } else {
            cover = await this.coversModel.getCover(beatmap.setId);
        }

        const message = this.templates.PP(l, beatmap, args);

        return {
            text: message + templateAddition,
            photo: cover,
        };
    }

    async beatmapInfo(l: ILocalisator, ctx: UnifiedMessageContext, beatmap: IBeatmap) {
        let templateAddition = "";
        if (await ctx.preferCardsOutput()) {
            const photo = await this.cards.generateBeatmapInfoCard(beatmap);

            if (photo) {
                const beatmapUrl = `https://osu.ppy.sh/b/${beatmap.id}`;
                return {
                    text: beatmapUrl,
                    photo: new InputFile(photo),
                };
            }

            templateAddition = "\n\n" + l.tr("card-gen-failed");
        }

        let cover: string;
        if (beatmap.coverUrl) {
            cover = await this.coversModel.getPhotoDoc(beatmap.coverUrl);
        } else {
            cover = await this.coversModel.getCover(beatmap.setId);
        }

        const message = this.templates.Beatmap(l, beatmap);

        return {
            text: message + templateAddition,
            photo: cover,
        };
    }
}

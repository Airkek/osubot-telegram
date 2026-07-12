import { OkiCardsGenerator } from "../../oki-cards/OkiCardsGenerator";
import { IMessageContext, MediaFile } from "../../core/MessageContext";
import { APIScore, APIUser, PPArgs } from "../../Types";
import Calculator from "../../osu_specific/pp/bancho";
import { IBeatmap } from "../../beatmaps/BeatmapTypes";
import { ILocalisator } from "../../ILocalisator";
import { ITemplates } from "../templates";
import BanchoPP from "../../osu_specific/pp/bancho";
import Util from "../../Util";
import { MediaAttachmentProvider } from "../../core/MediaAttachmentProvider";

export interface ReplyData {
    text: string;
    photo: MediaFile;
}

export class ReplyUtils {
    private readonly cards: OkiCardsGenerator;
    private readonly templates: ITemplates;
    private readonly mediaAttachments: MediaAttachmentProvider;
    constructor(cardsGenerator: OkiCardsGenerator, templates: ITemplates, mediaAttachments: MediaAttachmentProvider) {
        this.cards = cardsGenerator;
        this.templates = templates;
        this.mediaAttachments = mediaAttachments;
    }

    async scoreData(
        l: ILocalisator,
        ctx: IMessageContext,
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
                    photo: card,
                };
            }

            templateAddition = "\n\n" + l.tr("card-gen-failed");
        }
        const calculator = new Calculator(beatmap, score.mods);
        const cover = await this.getBeatmapCover(beatmap);
        const message = (await this.templates.ScoreFull(l, score, beatmap, calculator, serverBase)) + templateAddition;

        return {
            text: message,
            photo: cover,
        };
    }

    async userData(l: ILocalisator, ctx: IMessageContext, user: APIUser, serverBase: string) {
        let templateAddition = "";
        if (await ctx.preferCardsOutput()) {
            const card = await this.cards.generateUserCard(user, l);
            if (card) {
                return {
                    text: `${serverBase}/u/${user.id}`,
                    photo: card,
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
        ctx: IMessageContext,
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
                    photo: card,
                };
            }
            templateAddition = "\n\n" + l.tr("card-gen-failed");
        }
        const responses = await Promise.all(
            maps.map((map, i) => {
                const calc = new BanchoPP(map, scores[i].mods);
                return this.templates.TopScore(l, scores[i], map, startNum + i, calc, serverBase);
            })
        );
        const response = responses.join("\n");
        const message =
            `${l.tr("players-top-scores", {
                player_name: user.nickname,
            })} [${Util.profileModes[user.mode]}]:\n${response}` + templateAddition;

        return {
            text: message,
            photo: undefined,
        };
    }

    async beatmapPP(l: ILocalisator, ctx: IMessageContext, beatmap: IBeatmap, args: PPArgs) {
        let templateAddition = "";
        if (await ctx.preferCardsOutput()) {
            const photo = await this.cards.generateBeatmapPPCard(beatmap, l, args);

            if (photo) {
                const beatmapUrl = `https://osu.ppy.sh/b/${beatmap.id}`;
                return {
                    text: beatmapUrl,
                    photo,
                };
            }

            templateAddition = "\n\n" + l.tr("card-gen-failed");
        }

        const cover = await this.getBeatmapCover(beatmap);

        const message = await this.templates.PP(l, beatmap, args);

        return {
            text: message + templateAddition,
            photo: cover,
        };
    }

    async beatmapInfo(l: ILocalisator, ctx: IMessageContext, beatmap: IBeatmap) {
        let templateAddition = "";
        if (await ctx.preferCardsOutput()) {
            const photo = await this.cards.generateBeatmapInfoCard(beatmap);

            if (photo) {
                const beatmapUrl = `https://osu.ppy.sh/b/${beatmap.id}`;
                return {
                    text: beatmapUrl,
                    photo,
                };
            }

            templateAddition = "\n\n" + l.tr("card-gen-failed");
        }

        const cover = await this.getBeatmapCover(beatmap);

        const message = await this.templates.Beatmap(l, beatmap);

        return {
            text: message + templateAddition,
            photo: cover,
        };
    }

    private async getBeatmapCover(beatmap: IBeatmap): Promise<string | undefined> {
        return beatmap.coverUrl ? await this.mediaAttachments.getPhotoDoc(beatmap.coverUrl) : undefined;
    }
}

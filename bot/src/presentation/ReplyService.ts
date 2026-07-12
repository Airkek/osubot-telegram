import { IMessageContext } from "core/IMessageContext";
import { MediaFile } from "core/MediaFile";
import { IPerformanceRequest } from "games/osu/performance/IPerformanceRequest";
import { IGameScore } from "games/scores/IGameScore";
import { IGameUser } from "games/users/IGameUser";
import { OkiCardsGenerator } from "presentation/cards/OkiCardsGenerator";
import { BanchoPerformanceCalculator } from "games/osu/performance/bancho/BanchoPerformanceCalculator";
import { IBeatmap } from "games/IBeatmap";
import { ILocalizer } from "localization/ILocalizer";
import { ITemplateStorage } from "presentation/templates/ITemplateStorage";
import { Util } from "shared/Util";
import { IMediaAttachmentProvider } from "core/IMediaAttachmentProvider";
import { resolveScorePp } from "games/osu/performance/PPDisplay";
import { Mods } from "games/osu/performance/Mods";
import { OsuMode } from "games/osu/OsuMode";
import { BeatmapPerformanceSummary } from "presentation/templates/BeatmapPerformanceSummary";
import { ILeaderboardResult } from "games/leaderboards/ILeaderboardResult";

interface ReplyData {
    text: string;
    photo: MediaFile;
}

export class ReplyService {
    private readonly cards: OkiCardsGenerator;
    private readonly templates: ITemplateStorage;
    private readonly mediaAttachments: IMediaAttachmentProvider;
    constructor(
        cardsGenerator: OkiCardsGenerator,
        templates: ITemplateStorage,
        mediaAttachments: IMediaAttachmentProvider
    ) {
        this.cards = cardsGenerator;
        this.templates = templates;
        this.mediaAttachments = mediaAttachments;
    }

    async scoreData(
        l: ILocalizer,
        ctx: IMessageContext,
        score: IGameScore,
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
        const calculator = new BanchoPerformanceCalculator(beatmap, score.mods);
        const pp = await resolveScorePp(score, calculator);
        const cover = await this.getBeatmapCover(beatmap);
        const message = this.templates.ScoreFull(l, score, beatmap, pp, serverBase) + templateAddition;

        return {
            text: message,
            photo: cover,
        };
    }

    async userData(l: ILocalizer, ctx: IMessageContext, user: IGameUser, serverBase: string) {
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
        l: ILocalizer,
        ctx: IMessageContext,
        user: IGameUser,
        scores: IGameScore[],
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
        const pp = await Promise.all(
            maps.map((map, index) =>
                resolveScorePp(scores[index], new BanchoPerformanceCalculator(map, scores[index].mods))
            )
        );
        const responses = maps.map((map, index) =>
            this.templates.TopScore(l, scores[index], map, startNum + index, pp[index], serverBase)
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

    async leaderboard(
        l: ILocalizer,
        leaderboard: ILeaderboardResult,
        serverBase: string,
        startNumber: number,
        useCards: boolean
    ): Promise<ReplyData> {
        let templateAddition = "";
        if (useCards && leaderboard.scores.length > 0) {
            const card = await this.cards.generateLeaderboardCard(leaderboard, l, startNumber);
            if (card) {
                return {
                    text: leaderboard.map.url ?? `${serverBase}/b/${leaderboard.map.id}`,
                    photo: card,
                };
            }
            templateAddition = "\n\n" + l.tr("card-gen-failed");
        }

        return {
            text: this.templates.Leaderboard(l, leaderboard, startNumber) + templateAddition,
            photo: undefined,
        };
    }

    async beatmapPP(l: ILocalizer, ctx: IMessageContext, beatmap: IBeatmap, args: IPerformanceRequest) {
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

        const input = Util.createPPArgs(args, beatmap.mode);
        const performance = await new BanchoPerformanceCalculator(beatmap, beatmap.currentMods).calculate(input);
        const message = this.templates.PP(l, beatmap, input, performance);

        return {
            text: message + templateAddition,
            photo: cover,
        };
    }

    async beatmapInfo(l: ILocalizer, ctx: IMessageContext, beatmap: IBeatmap) {
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

        const performance = await this.calculateBeatmapPerformance(beatmap);
        const message = this.templates.Beatmap(l, beatmap, performance);

        return {
            text: message + templateAddition,
            photo: cover,
        };
    }

    private async getBeatmapCover(beatmap: IBeatmap): Promise<string | undefined> {
        return beatmap.coverUrl ? await this.mediaAttachments.getPhotoDoc(beatmap.coverUrl) : undefined;
    }

    private async calculateBeatmapPerformance(beatmap: IBeatmap): Promise<BeatmapPerformanceSummary> {
        const mods = new Mods(0);
        const calculator = new BanchoPerformanceCalculator(beatmap, mods);
        if (beatmap.mode === OsuMode.Mania) {
            const performance = await calculator.calculate(
                Util.createPPArgs(
                    {
                        hits: beatmap.hitObjectsCount,
                        score: 1_000_000,
                        mods,
                    },
                    beatmap.mode
                )
            );
            return { kind: "mania-score", pp: performance.pp };
        }

        const calculate = async (accuracy: number) =>
            await calculator.calculate(
                Util.createPPArgs(
                    {
                        acc: accuracy,
                        combo: beatmap.maxCombo,
                        hits: beatmap.hitObjectsCount,
                        miss: 0,
                        mods,
                    },
                    beatmap.mode
                )
            );
        const [pp98, pp99] = await Promise.all([calculate(0.98), calculate(0.99)]);
        return { kind: "accuracy", pp98: pp98.pp, pp99: pp99.pp, pp100: pp98.ss };
    }
}

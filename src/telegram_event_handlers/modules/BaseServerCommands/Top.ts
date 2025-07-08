import { ServerModule } from "../Module";
import Util, { IKeyboard } from "../../../Util";
import BanchoPP from "../../../osu_specific/pp/bancho";
import Mods from "../../../osu_specific/pp/Mods";
import { ServerCommand, CommandContext } from "../../ServerCommand";
import { Mode, APIUser, APIScore } from "../../../Types";
import { GrammyError, InputFile } from "grammy";
import { IBeatmap } from "../../../beatmaps/BeatmapTypes";
import { ILocalisator } from "../../../ILocalisator";

interface ScoreProcessingOptions {
    context: CommandContext;
    user: APIUser;
    mode: number;
    modsFilter?: (score: APIScore) => boolean;
}

export default class AbstractTop extends ServerCommand {
    private readonly ignoreDbUpdate: boolean;

    constructor(module: ServerModule, ignoreDbUpdate: boolean = false) {
        super(
            ["top", "t", "е", "ещз"],
            module,
            async (context) => {
                const mode = this.determineGameMode(context);
                const user = await this.fetchUserData(context, mode);

                if (!this.ignoreDbUpdate) {
                    await context.module.db.updateInfo(user, mode);
                }

                await this.handleCommandArguments(context, user, mode, context.ctx);
            },
            true
        );

        this.ignoreDbUpdate = ignoreDbUpdate;
    }

    private determineGameMode(context: CommandContext): number {
        return context.args.mode !== null ? context.args.mode : context.user.dbUser?.mode || 0;
    }

    private async fetchUserData(context: CommandContext, mode: number): Promise<APIUser> {
        return context.user.username
            ? await context.module.api.getUser(context.user.username, mode)
            : await context.module.api.getUserById(context.user.id || context.user.dbUser.game_id, mode);
    }

    private async handleCommandArguments(context: CommandContext, user: APIUser, mode: number, l: ILocalisator) {
        if (context.args.apx) {
            await this.handleApxRequest(context, user, mode, l);
        } else if (context.args.more) {
            await this.handleMoreRequest(context, user, mode, l);
        } else if (context.args.place) {
            await this.handlePlaceRequest(context, user, mode, l);
        } else {
            await this.handleDefaultRequest(context, user, mode, l);
        }
    }

    private async processScores(options: ScoreProcessingOptions, l: ILocalisator): Promise<APIScore[] | null> {
        const { context, user, mode, modsFilter } = options;
        const scores = await context.module.api.getUserTopById(user.id, mode, 100);

        if (modsFilter) {
            const filtered = scores.filter(modsFilter);
            if (filtered.length === 0) {
                await context.reply(l.tr("not-found-scores-with-mod-combo"));
                return null;
            }
            return filtered;
        }

        return scores;
    }

    private async handleApxRequest(context: CommandContext, user: APIUser, mode: number, l: ILocalisator) {
        const modsFilter = this.createModsFilter(context);
        const scores = await this.processScores({ context, user, mode, modsFilter }, l);
        if (!scores) {
            return;
        }

        const closest = scores.reduce((prev, curr, index) => {
            curr.top100_number = index + 1;
            return Math.abs(curr.pp - context.args.apx) < Math.abs(prev.pp - context.args.apx) ? curr : prev;
        }, scores[0]);

        await this.sendScoreResponse(
            context,
            user,
            closest,
            mode,
            l.tr("near-pp-score", {
                pp: context.args.apx,
            }),
            l
        );
    }

    private async handleMoreRequest(context: CommandContext, user: APIUser, mode: number, l: ILocalisator) {
        const modsFilter = this.createModsFilter(context);
        const scores = await this.processScores({ context, user, mode, modsFilter }, l);
        if (!scores) {
            return;
        }

        const count = scores.filter((s) => s.pp > context.args.more).length;
        await context.reply(
            l.tr("score-count", {
                player_name: user.nickname,
                count,
                pp: context.args.more,
            })
        );
    }

    private async handlePlaceRequest(context: CommandContext, user: APIUser, mode: number, l: ILocalisator) {
        const scores = await context.module.api.getUserTopById(user.id, mode, context.args.place);
        const score = scores[context.args.place - 1];

        await this.sendScoreResponse(
            context,
            user,
            score,
            mode,
            l.tr("top-n-score", {
                place: context.args.place,
            }),
            l
        );
    }

    private async handleDefaultRequest(context: CommandContext, user: APIUser, mode: number, l: ILocalisator) {
        const scores = await this.processScores({ context, user, mode }, l);
        if (!scores) {
            return;
        }

        const page = context.args.page ?? 1;

        const needCards = await context.ctx.preferCardsOutput();

        const scoresOnPage = needCards ? 5 : 3;
        const maxPage = Math.ceil(scores.length / scoresOnPage);

        if (page < 1 || page > maxPage) {
            return await context.reply(
                l.tr("max-page-error", {
                    pages: maxPage,
                })
            );
        }

        const startI = (page - 1) * scoresOnPage;
        const endI = startI + scoresOnPage;

        const topThree = scores.slice(startI, endI);
        const maps = await Promise.all(topThree.map((score) => this.resolveBeatmap(context, score, mode)));

        const keyboard = this.createPageKeyboard(context, maxPage, page, user, mode);

        let message = "";
        let photo: InputFile = undefined;
        if (needCards) {
            photo = new InputFile(await this.module.bot.okiChanCards.generateTopScoresCard(topThree, maps, user, l));
        } else {
            const response = maps
                .map((map, i) => {
                    const calc = new BanchoPP(map, topThree[i].mods);
                    return context.module.bot.templates.TopScore(
                        l,
                        topThree[i],
                        map,
                        startI + i + 1,
                        calc,
                        context.module.link
                    );
                })
                .join("\n");
            message = `${l.tr("players-top-scores", {
                player_name: user.nickname,
            })} [${Util.profileModes[mode]}]:\n${response}`;
        }
        if (context.isPayload) {
            try {
                await context.edit(message, { keyboard, photo });
            } catch (e) {
                if (e instanceof GrammyError && e.message.includes("message is not modified")) {
                    await context.answer(l.tr("no-updates-notification"));
                    return;
                }
                throw e;
            }
        } else {
            await context.reply(message, { keyboard, photo });
        }
    }

    private createModsFilter(context: CommandContext): ((score: APIScore) => boolean) | undefined {
        if (!context.args.mods) {
            return undefined;
        }

        const targetMods = new Mods(context.args.mods);
        return (score: APIScore) => score.mods.sum() === targetMods.sum();
    }

    private async sendScoreResponse(
        context: CommandContext,
        user: APIUser,
        score: APIScore,
        mode: number,
        header: string,
        l: ILocalisator
    ) {
        const map = await this.resolveBeatmap(context, score, mode);
        let cover: string | InputFile;

        let message = `${header} ${user.nickname} (${Mode[score.mode]})`;

        if (await context.ctx.preferCardsOutput()) {
            cover = new InputFile(await context.module.bot.okiChanCards.generateScoreCard(score, map, context.ctx));
            const beatmapUrl = map.url ?? `${context.module.link}/b/${map.id}`;
            message += `\n\n${context.ctx.tr("score-beatmap-link")}: ${beatmapUrl}`;
        } else {
            const ppCalc = new BanchoPP(map, score.mods);
            if (map.coverUrl) {
                cover = await context.module.bot.database.covers.getPhotoDoc(map.coverUrl);
            } else {
                cover = await context.module.bot.database.covers.getCover(map.setId);
            }
            message += ":\n" + context.module.bot.templates.ScoreFull(l, score, map, ppCalc, context.module.link);
        }

        const keyboard = this.createScoreKeyboard(context, map.id, score);

        await context.reply(message, { photo: cover, keyboard });
        context.module.bot.maps.setMap(context.ctx.chatId, map);
    }

    private createScoreKeyboard(context: CommandContext, mapId: number, score: APIScore): IKeyboard {
        if (!context.module.api.getScore) {
            return undefined;
        }

        const buttons = [
            [
                {
                    text: `[${context.module.prefix[0].toUpperCase()}] ${context.ctx.tr("my-score-on-map-button")}`,
                    command: `{map${mapId}}${context.module.prefix[0]} c`,
                },
            ],
        ];

        if (context.ctx.isInGroupChat) {
            buttons[0].push({
                text: `[${context.module.prefix[0].toUpperCase()}] ${context.ctx.tr("chat-map-leaderboard-button")}`,
                command: `{map${mapId}}${context.module.prefix[0]} lb`,
            });
        }

        if (score.has_replay && score.api_score_id) {
            const settingsAllowed = process.env.RENDER_REPLAYS === "true";
            if (settingsAllowed) {
                buttons.push([
                    {
                        text: context.ctx.tr("render-replay-button"),
                        command: `render_bancho:${score.api_score_id}`,
                    },
                ]);
            }
        }

        return buttons;
    }

    private createPageKeyboard(
        context: CommandContext,
        maxPage: number,
        currentPage: number,
        user: APIUser,
        mode: number
    ) {
        const prefix = context.module.prefix[0];
        const modeArg = this.modeArg(mode);

        const prevPage = Math.max(currentPage - 1, 1);
        const nextPage = Math.min(currentPage + 1, maxPage);

        const nickname = this.module.api.getUserTop === undefined ? user.id : user.nickname;

        const buttonPrev = {
            text: "⬅️",
            command: `${prefix} t ${nickname} ^p${prevPage} ${modeArg}`,
        };
        const buttonPage = {
            text: `${currentPage}/${maxPage} 🔄`,
            command: `${prefix} t ${nickname} ^p${currentPage} ${modeArg}`,
        };
        const buttonNext = {
            text: "➡️",
            command: `${prefix} t ${nickname} ^p${nextPage} ${modeArg}`,
        };

        const buttons = [buttonPrev, buttonPage, buttonNext];

        return [buttons];
    }

    private modeArg(mode: number) {
        switch (mode) {
            case 0:
                return "-std";
            case 1:
                return "-t";
            case 2:
                return "-ctb";
            case 3:
                return "-m";
            default:
                return "-std";
        }
    }

    private async resolveBeatmap(context: CommandContext, score: APIScore, mode: number) {
        let map: IBeatmap = score.beatmap;
        if (!map) {
            map = await context.module.beatmapProvider.getBeatmapById(score.beatmapId, mode);
            await map.applyMods(score.mods);
        }
        return map;
    }
}

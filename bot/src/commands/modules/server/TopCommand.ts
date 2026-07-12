import { ServerModule } from "commands/ServerModule";
import { CommandContext } from "commands/CommandContext";
import { MessageNotModifiedError } from "core/MessageNotModifiedError";
import { OSU_MODE_NAMES } from "games/osu/OsuMode";
import { IGameScore } from "games/scores/IGameScore";
import { IGameUser } from "games/users/IGameUser";
import { IKeyboardButton } from "presentation/keyboard/IKeyboardButton";
import { IKeyboard } from "presentation/keyboard/IKeyboard";
import { IKeyboardRow } from "presentation/keyboard/IKeyboardRow";
import { makeKeyboard } from "presentation/keyboard/makeKeyboard";
import { Mods } from "games/osu/performance/Mods";
import { ServerCommand } from "commands/ServerCommand";
import { IBeatmap } from "games/IBeatmap";
import { ILocalizer } from "localization/ILocalizer";

interface ScoreProcessingOptions {
    context: CommandContext;
    user: IGameUser;
    mode: number;
    modsFilter?: (score: IGameScore) => boolean;
}

export class TopCommand extends ServerCommand {
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

    private async fetchUserData(context: CommandContext, mode: number): Promise<IGameUser> {
        return context.user.username
            ? await context.module.api.getUser(context.user.username, mode)
            : await context.module.api.getUserById(context.user.id || context.user.dbUser.game_id, mode);
    }

    private async handleCommandArguments(context: CommandContext, user: IGameUser, mode: number, l: ILocalizer) {
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

    private async processScores(options: ScoreProcessingOptions, l: ILocalizer): Promise<IGameScore[] | null> {
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

    private async handleApxRequest(context: CommandContext, user: IGameUser, mode: number, l: ILocalizer) {
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

    private async handleMoreRequest(context: CommandContext, user: IGameUser, mode: number, l: ILocalizer) {
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

    private async handlePlaceRequest(context: CommandContext, user: IGameUser, mode: number, l: ILocalizer) {
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

    private async handleDefaultRequest(context: CommandContext, user: IGameUser, mode: number, l: ILocalizer) {
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

        const topScores = scores.slice(startI, endI);
        const maps = await Promise.all(topScores.map((score) => this.resolveBeatmap(context, score, mode)));

        const keyboard = this.createPageKeyboard(context, maxPage, page, user, mode);

        const data = await context.module.bot.replies.topScores(
            l,
            context.ctx,
            user,
            topScores,
            maps,
            context.module.link,
            startI + 1
        );
        if (context.isPayload) {
            try {
                await context.edit(data.text, { keyboard, photo: data.photo });
            } catch (e) {
                if (e instanceof MessageNotModifiedError) {
                    await context.answer(l.tr("no-updates-notification"));
                    return;
                }
                throw e;
            }
        } else {
            await context.reply(data.text, { keyboard, photo: data.photo });
        }
    }

    private createModsFilter(context: CommandContext): ((score: IGameScore) => boolean) | undefined {
        if (!context.args.mods) {
            return undefined;
        }

        const targetMods = new Mods(context.args.mods);
        return (score: IGameScore) => score.mods.sum() === targetMods.sum();
    }

    private async sendScoreResponse(
        context: CommandContext,
        user: IGameUser,
        score: IGameScore,
        mode: number,
        header: string,
        l: ILocalizer
    ) {
        const map = await this.resolveBeatmap(context, score, mode);
        const message = `${header} ${user.nickname} (${OSU_MODE_NAMES[score.mode]})`;
        const keyboard = this.createScoreKeyboard(context, map.id, score);

        const replyData = await this.module.bot.replies.scoreData(l, context.ctx, score, map, context.module.link);
        await context.reply(message + "\n\n" + replyData.text, {
            keyboard,
            photo: replyData.photo,
        });
        context.module.bot.chatBeatmaps.setMap(context.ctx.chatId, map);
    }

    private createScoreKeyboard(context: CommandContext, mapId: number, score: IGameScore): IKeyboard {
        if (!context.module.api.getScore) {
            return undefined;
        }

        const buttons: IKeyboardButton[][] = [
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

        return makeKeyboard(buttons);
    }

    private createPageKeyboard(
        context: CommandContext,
        maxPage: number,
        currentPage: number,
        user: IGameUser,
        mode: number
    ): IKeyboard {
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

        const buttons: IKeyboardRow = [buttonPrev, buttonPage, buttonNext];

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

    private async resolveBeatmap(context: CommandContext, score: IGameScore, mode: number) {
        let map: IBeatmap = score.beatmap;
        if (!map) {
            map = await context.module.beatmapProvider.getBeatmapById(score.beatmapId, mode);
            await map.applyMods(score.mods);
        }
        return map;
    }
}

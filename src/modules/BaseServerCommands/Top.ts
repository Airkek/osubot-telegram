import { Module } from "../../Module";
import Util from "../../Util";
import BanchoPP from "../../pp/bancho";
import Mods from "../../pp/Mods";
import { ServerCommand, CommandContext } from "./BasicServerCommand";
import { Mode, APIUser, APIScore } from "../../Types";

interface ScoreProcessingOptions {
    context: CommandContext;
    user: APIUser;
    mode: number;
    modsFilter?: (score: APIScore) => boolean;
}

export default class AbstractTop extends ServerCommand {
    private readonly ignoreDbUpdate: boolean;

    constructor(module: Module, ignoreDbUpdate: boolean = false) {
        super(
            ["top", "t", "е", "ещз"],
            module,
            async (context) => {
                const mode = this.determineGameMode(context);
                const user = await this.fetchUserData(context, mode);

                if (!this.ignoreDbUpdate) {
                    await context.module.db.updateInfo(user, mode);
                }

                await this.handleCommandArguments(context, user, mode);
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

    private async handleCommandArguments(context: CommandContext, user: APIUser, mode: number) {
        if (context.args.apx) {
            await this.handleApxRequest(context, user, mode);
        } else if (context.args.more) {
            await this.handleMoreRequest(context, user, mode);
        } else if (context.args.place) {
            await this.handlePlaceRequest(context, user, mode);
        } else {
            await this.handleDefaultRequest(context, user, mode);
        }
    }

    private async processScores(options: ScoreProcessingOptions): Promise<APIScore[] | null> {
        const { context, user, mode, modsFilter } = options;
        const scores = await context.module.api.getUserTopById(user.id, mode, 100);

        if (modsFilter) {
            const filtered = scores.filter(modsFilter);
            if (filtered.length === 0) {
                await context.reply("Не найдено топ скоров с указанной комбинацией модов!");
                return null;
            }
            return filtered;
        }

        return scores;
    }

    private async handleApxRequest(context: CommandContext, user: APIUser, mode: number) {
        const modsFilter = this.createModsFilter(context);
        const scores = await this.processScores({ context, user, mode, modsFilter });
        if (!scores) {
            return;
        }

        const closest = scores.reduce((prev, curr, index) => {
            curr.top100_number = index + 1;
            return Math.abs(curr.pp - context.args.apx) < Math.abs(prev.pp - context.args.apx) ? curr : prev;
        }, scores[0]);

        await this.sendScoreResponse(context, user, closest, mode, `Ближайший к ${context.args.apx}pp скор игрока`);
    }

    private async handleMoreRequest(context: CommandContext, user: APIUser, mode: number) {
        const modsFilter = this.createModsFilter(context);
        const scores = await this.processScores({ context, user, mode, modsFilter });
        if (!scores) {
            return;
        }

        const count = scores.filter((s) => s.pp > context.args.more).length;
        const suffix = count === 100 ? "+" : "";
        await context.reply(
            `У игрока ${user.nickname} ${count || "нет"}${suffix} ` +
                `${Util.scoreNum(count)} выше ${context.args.more}pp`
        );
    }

    private async handlePlaceRequest(context: CommandContext, user: APIUser, mode: number) {
        const scores = await context.module.api.getUserTopById(user.id, mode, context.args.place);
        const score = scores[context.args.place - 1];

        await this.sendScoreResponse(context, user, score, mode, `Топ #${context.args.place} скор игрока`);
    }

    private async handleDefaultRequest(context: CommandContext, user: APIUser, mode: number) {
        const scores = await this.processScores({ context, user, mode });
        if (!scores) {
            return;
        }

        const page = context.args.page ?? 1;

        const scoresOnPage = 3;
        const startI = (page - 1) * scoresOnPage;
        const endI = startI + scoresOnPage;

        const topThree = scores.slice(startI, endI);
        const maps = await Promise.all(topThree.map((score) => this.resolveBeatmap(context, score, mode)));

        const response = maps
            .map((map, i) => {
                const calc = new BanchoPP(map, topThree[i].mods);
                return context.module.bot.templates.TopScore(
                    topThree[i],
                    map,
                    startI + i + 1,
                    calc,
                    context.module.link
                );
            })
            .join("\n");

        const keyboard = this.createPageKeyboard(context, scores.length, scoresOnPage, page, user, mode);
        const message = `Топ скоры игрока ${user.nickname} [${Util.profileModes[mode]}]:\n${response}`;
        if (context.isPayload) {
            await context.edit(message, { keyboard });
        } else {
            await context.reply(message, { keyboard });
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
        header: string
    ) {
        const map = await this.resolveBeatmap(context, score, mode);
        const ppCalc = new BanchoPP(map, score.mods);
        const cover = await context.module.bot.database.covers.getCover(map.id.set);

        const message =
            `${header} ${user.nickname} (${Mode[score.mode]}):\n` +
            context.module.bot.templates.ScoreFull(score, map, ppCalc, context.module.link);

        const keyboard = this.createScoreKeyboard(context, map.id.map);

        await context.reply(message, { attachment: cover, keyboard });
        context.module.bot.maps.setMap(context.ctx.peerId, map);
    }

    private createScoreKeyboard(context: CommandContext, mapId: number) {
        if (!context.module.api.getScore) {
            return undefined;
        }

        const buttons = [
            {
                text: `[${context.module.prefix[0].toUpperCase()}] Мой скор на карте`,
                command: `{map${mapId}}${context.module.prefix[0]} c`,
            },
        ];

        if (context.ctx.isChat) {
            buttons.push({
                text: `[${context.module.prefix[0].toUpperCase()}] Топ чата на карте`,
                command: `{map${mapId}}${context.module.prefix[0]} lb`,
            });
        }

        return Util.createKeyboard([buttons]);
    }

    private createPageKeyboard(
        context: CommandContext,
        scoresCount: number,
        pageSize: number,
        currentPage: number,
        user: APIUser,
        mode: number
    ) {
        if (!context.module.api.getScore) {
            return undefined;
        }

        const maxPage = Math.ceil(scoresCount / pageSize);
        const prefix = context.module.prefix[0];
        const modeArg = this.modeArg(mode);

        const buttonPrev = {
            text: "⬅️",
            command: `${prefix} t ${user.nickname} --p${currentPage - 1} ${modeArg}`,
        };
        const buttonPage = {
            text: `${currentPage}/${maxPage} 🔄`,
            command: `${prefix} t ${user.nickname} --p${currentPage} ${modeArg}`,
        };
        const buttonNext = {
            text: "➡️",
            command: `${prefix} t ${user.nickname} --p${currentPage + 1} ${modeArg}`,
        };

        const buttons = [];
        if (currentPage > 1) {
            buttons.push(buttonPrev);
        }
        buttons.push(buttonPage);
        if (currentPage < maxPage) {
            buttons.push(buttonNext);
        }

        return Util.createKeyboard([buttons]);
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
        return score.beatmap ?? (await context.module.api.getBeatmap(score.beatmapId, mode, score.mods));
    }
}

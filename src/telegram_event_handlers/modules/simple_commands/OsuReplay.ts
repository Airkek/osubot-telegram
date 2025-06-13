import fs from "fs";
import { ScoreDecoder } from "osu-parsers";
import { Command } from "../../Command";
import { SimpleCommandsModule } from "./index";
import UnifiedMessageContext from "../../../TelegramSupport";
import Calculator from "../../../osu_specific/pp/bancho";
import Util from "../../../Util";
import { IReplayRenderer } from "../../../osu_specific/replay_render/IReplayRenderer";
import { IssouBestRenderer } from "../../../osu_specific/replay_render/IssouBestRenderer";
import { OsrReplay } from "../../../osu_specific/OsrReplay";
import { ExperimentalRenderer } from "../../../osu_specific/replay_render/ExperimentalRenderer";

export class OsuReplay extends Command {
    renderer: IReplayRenderer;
    experimental_renderer: IReplayRenderer;
    rate = {};

    rendered = 0;
    failedRenders = 0;

    rendered_experimental = 0;
    failedRenders_experimental = 0;

    constructor(module: SimpleCommandsModule) {
        super(["osu_replay"], module, async (ctx) => {
            const MAX_FILE_SIZE = 5 * 1024 * 1024;

            let file: Buffer;
            if (ctx.messagePayload) {
                const messagePayload = ctx.messagePayload.split(":");
                if (messagePayload.length < 2) {
                    return;
                }
                switch (messagePayload[0]) {
                    case "render_bancho": {
                        const scoreId = Number(messagePayload[1]);
                        if (isNaN(scoreId)) {
                            return;
                        }
                        file = await this.module.bot.api.bancho.downloadReplay(scoreId);
                        break;
                    }
                    default:
                        return;
                }
            } else {
                if (ctx.getFileSize() > MAX_FILE_SIZE) {
                    await ctx.reply("Файл слишком большой!");
                    return;
                }

                const localPath = await ctx.downloadFile();
                try {
                    file = fs.readFileSync(localPath);
                } finally {
                    ctx.removeFile();
                }
            }

            const decoder = new ScoreDecoder();
            const score = await decoder.decodeFromBuffer(file, true);
            const replay = new OsrReplay(score);
            const beatmap = await module.bot.osuBeatmapProvider.getBeatmapByHash(replay.beatmapHash, replay.mode);
            await beatmap.applyMods(replay.mods);
            const cover = await module.bot.database.covers.getCover(beatmap.setId);
            const calculator = new Calculator(beatmap, replay.mods);

            const keyboard = Util.createKeyboard(
                [
                    ["B", "s"],
                    ["G", "g"],
                    ["R", "r"],
                ].map((group) => [
                    { text: `[${group[0]}] Мой скор`, command: `${group[1]} c ${Util.getModeArg(replay.mode)}` },
                    ...(ctx.isInGroupChat
                        ? [
                              {
                                  text: `[${group[0]}] Топ чата`,
                                  command: `${group[1]} lb ${Util.getModeArg(replay.mode)}`,
                              },
                          ]
                        : []),
                ])
            );

            const settings = await this.module.bot.database.userSettings.getUserSettings(ctx.senderId);
            const isChat = ctx.senderId != ctx.chatId;
            let settingsAllowed = settings.render_enabled || !!ctx.messagePayload;
            if (isChat && settingsAllowed && !ctx.messagePayload) {
                const chatSettings = await this.module.bot.database.chatSettings.getChatSettings(ctx.chatId);
                settingsAllowed = settingsAllowed && chatSettings.render_enabled;
            }

            const fallbackToExperimental =
                !settings.experimental_renderer &&
                !this.renderer.supportGameMode(replay.mode) &&
                this.experimental_renderer.supportGameMode(replay.mode);

            const useExperimental = settings.experimental_renderer || fallbackToExperimental;

            const renderer = useExperimental ? this.experimental_renderer : this.renderer;
            const canRender =
                process.env.RENDER_REPLAYS === "true" && settingsAllowed && renderer.supportGameMode(replay.mode);
            let renderAdditional = canRender
                ? "\n\nРендер реплея в процессе..."
                : ctx.messagePayload
                  ? "Рендер недоступен"
                  : "";

            if (canRender && useExperimental) {
                renderAdditional +=
                    "\n⚠️Используется экспериментальный рендерер. Некоторые функции могут быть недоступны или работать неправильно.\n\nПросьба сообщать о найденных ошибках в комментарии к посту - https://t.me/osubotupdates/34";
            }
            let needRender = canRender;
            if (needRender) {
                if (this.checkLimit(ctx.senderId)) {
                    needRender = false;
                    renderAdditional = "\n\nРендер реплея доступен раз в 5 минут";
                } else {
                    this.setLimit(ctx.senderId);
                }
            }

            if (needRender) {
                const rendererAvailable = await renderer.available();
                if (!rendererAvailable) {
                    needRender = false;
                    if (fallbackToExperimental) {
                        renderAdditional = `\n\nЭтот режим игры поддерживается только экспериментальным рендерером, который сейчас недоступен. Попробуйте позже.`;
                    } else {
                        const rendererName = settings.render_enabled ? "experimental" : "o!rdr";
                        renderAdditional = `\n\nВыбраный рендерер (${rendererName}) сейчас недоступен. Попробуйте позже или измените рендерер в настройах. Для этого введите /settings в личных сообщениях с ботом`;
                    }

                    this.removeLimit(ctx.senderId);
                }
            }

            const renderHeader = `Player: ${replay.player}\n\n`;

            let fullBody = renderAdditional.trim();
            if (!ctx.messagePayload) {
                fullBody =
                    renderHeader +
                    module.bot.templates.ScoreFull(replay, beatmap, calculator, "https://osu.ppy.sh") +
                    renderAdditional;
            }

            await ctx.reply(fullBody, {
                photo: !ctx.messagePayload ? cover : undefined,
                keyboard: !ctx.messagePayload ? keyboard : undefined,
            });
            module.bot.maps.setMap(ctx.chatId, beatmap);

            if (!needRender) {
                return;
            }

            const replayResponse = await renderer.render(file, {
                skin: settings.ordr_skin,
                video: settings.ordr_video,
                storyboard: settings.ordr_storyboard,
                dim: settings.ordr_bgdim,
                pp_counter: settings.ordr_pp_counter,
                ur_counter: settings.ordr_ur_counter,
                hit_counter: settings.ordr_hit_counter,
                strain_graph: settings.ordr_strain_graph,
                isSkinCustom: settings.ordr_is_skin_custom,
            });

            if (replayResponse.success) {
                if (useExperimental) {
                    this.rendered_experimental++;
                } else {
                    this.rendered++;
                }
                await ctx.reply("", {
                    video: {
                        url: replayResponse.video.url,
                        width: replayResponse.video.width,
                        height: replayResponse.video.heigth,
                        duration: Math.ceil(beatmap.stats.length),
                    },
                });
            } else {
                this.removeLimit(ctx.senderId);
                if (useExperimental) {
                    this.failedRenders_experimental++;
                } else {
                    this.failedRenders++;
                }
                if (replayResponse.error.includes("This replay is already rendering or in queue")) {
                    let text = "Этот реплей уже рендерится на o!rdr.";
                    if (isChat) {
                        text +=
                            "\n\nЕсли в вашем чате есть другой бот, который рендерит реплеи, отключите рендер для этого чата в текущем боте - /settings\nЕсли этого не сделать, есть риск бана на o!rdr по нику из реплея.";
                    }
                    await ctx.reply(text, {
                        keyboard: Util.createKeyboard([[{ text: "⚙️Настройки чата", command: "osu settings" }]]),
                    });
                } else {
                    await ctx.reply(`Ошибка при рендере реплея: ${replayResponse.error}`);
                }
            }
        });

        this.renderer = new IssouBestRenderer();
        this.experimental_renderer = new ExperimentalRenderer();
    }

    check(name: string, ctx: UnifiedMessageContext): boolean {
        return (
            (ctx.hasFile() && ctx.getFileName()?.endsWith(".osr")) ||
            (ctx.messagePayload && ctx.messagePayload.startsWith("render_bancho:"))
        );
    }

    private checkLimit(user: number) {
        const TIMEOUT = 300; // 5 mins
        const u = this.rate[user];
        const date = new Date().getTime();
        if (u) {
            return date - u < TIMEOUT * 1000;
        }

        return false;
    }

    private setLimit(user: number) {
        this.rate[user] = new Date().getTime();
    }

    private removeLimit(user: number) {
        this.rate[user] = 0;
    }
}

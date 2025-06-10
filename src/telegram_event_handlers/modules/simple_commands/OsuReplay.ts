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

export class OsuReplay extends Command {
    renderer: IReplayRenderer;
    rate = {};
    rendered = 0;
    failedRenders = 0;

    constructor(module: SimpleCommandsModule) {
        super(["osu_replay"], module, async (ctx) => {
            const MAX_FILE_SIZE = 5 * 1024 * 1024;

            if (ctx.getFileSize() > MAX_FILE_SIZE) {
                await ctx.reply("Файл слишком большой!");
                return;
            }

            const localPath = await ctx.downloadFile();
            let file: Buffer;
            try {
                file = fs.readFileSync(localPath);
            } finally {
                ctx.removeFile();
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
            let settingsAllowed = settings.render_enabled;
            if (isChat && settingsAllowed) {
                const chatSettings = await this.module.bot.database.chatSettings.getChatSettings(ctx.chatId);
                settingsAllowed = settingsAllowed && chatSettings.render_enabled;
            }

            const canRender = process.env.RENDER_REPLAYS === "true" && settingsAllowed && replay.mode == 0;
            let renderAdditional = canRender ? "\n\nРендер реплея в процессе..." : "";
            let needRender = canRender;
            if (canRender) {
                if (this.checkLimit(ctx.senderId)) {
                    needRender = false;
                    renderAdditional = "\n\nРендер реплея доступен раз в 5 минут";
                } else {
                    this.setLimit(ctx.senderId);
                }
            }

            const renderHeader = `Player: ${replay.player}\n\n`;

            await ctx.reply(
                renderHeader +
                    module.bot.templates.ScoreFull(replay, beatmap, calculator, "https://osu.ppy.sh") +
                    renderAdditional,
                {
                    photo: cover,
                    keyboard,
                }
            );
            module.bot.maps.setMap(ctx.chatId, beatmap);

            if (!needRender) {
                return;
            }
            const replayResponse = await this.renderer.render(file, {
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
                this.rendered++;
                await ctx.reply("", {
                    video: {
                        url: replayResponse.video.url,
                        width: replayResponse.video.width,
                        height: replayResponse.video.heigth,
                        duration: replayResponse.video.duration,
                    },
                });
            } else {
                this.removeLimit(ctx.senderId);
                this.failedRenders++;
                if (replayResponse.error.includes("This replay is already rendering or in queue")) {
                    let text = "Этот реплей уже рендерится на o!rdr.";
                    if (isChat) {
                        text +=
                            "\n\nЕсли в вашем чате есть другой бот, который рендерит реплеи, отключите рендер в текущем боте - /settings\nЕсли этого не сделать, есть риск бана на o!rdr по нику из реплея.";
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
    }

    check(name: string, ctx: UnifiedMessageContext): boolean {
        return ctx.hasFile() && ctx.getFileName()?.endsWith(".osr");
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

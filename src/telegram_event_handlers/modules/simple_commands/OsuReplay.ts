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

    constructor(module: SimpleCommandsModule) {
        super(["osu_replay"], module, async (ctx) => {
            const MAX_FILE_SIZE = 30 * 1024 * 1024;

            const replayFileInfo = ctx.tgCtx.message?.document;
            if (replayFileInfo?.file_size && replayFileInfo?.file_size > MAX_FILE_SIZE) {
                await ctx.reply("Файл слишком большой!");
                return;
            }

            const replayFile = await ctx.tgCtx.getFile();
            if (!replayFile?.file_path) {
                return;
            }

            if (replayFile.file_size > MAX_FILE_SIZE) {
                await ctx.reply("Файл слишком большой!");
                if (this.module.bot.useLocalApi) {
                    const url = replayFile.getUrl();
                    global.logger.fatal(`Too big file was downloaded: ${url}`);
                    try {
                        fs.rmSync(url);
                    } catch {
                        global.logger.fatal(`Failed to remove file: ${url}`);
                    }
                }
                return;
            }

            const localPath = module.bot.useLocalApi ? replayFile.getUrl() : await replayFile.download();
            let file: Buffer;
            try {
                file = fs.readFileSync(localPath);
            } finally {
                try {
                    fs.rmSync(localPath);
                } catch {
                    global.logger.fatal(`Failed to remove file: ${localPath}`);
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
                    ...(ctx.isChat
                        ? [
                              {
                                  text: `[${group[0]}] Топ чата`,
                                  command: `${group[1]} lb ${Util.getModeArg(replay.mode)}`,
                              },
                          ]
                        : []),
                ])
            );

            const canRender = process.env.RENDER_REPLAYS === "true" && replay.mode == 0;
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

            await ctx.reply(module.bot.templates.Replay(replay, beatmap, calculator) + renderAdditional, {
                attachment: cover,
                keyboard,
            });
            module.bot.maps.setMap(ctx.peerId, beatmap);

            if (!needRender) {
                return;
            }
            const replayResponse = await this.renderer.render(file);

            if (replayResponse.success) {
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
                await ctx.reply(`Ошибка при рендере реплея: ${replayResponse.error}`);
            }
        });

        this.renderer = new IssouBestRenderer();
    }

    check(name: string, ctx: UnifiedMessageContext): boolean {
        if (!ctx.hasAttachments("doc")) {
            return false;
        }
        return ctx.tgCtx.message?.document?.file_name?.endsWith(".osr");
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

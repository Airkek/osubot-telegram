import { Command } from "../../Command";
import { SimpleCommandsModule } from "./index";
import UnifiedMessageContext from "../../../TelegramSupport";
import axios from "axios";
import { ReplayParser } from "../../../osu_specific/OsuReplay";
import Calculator from "../../../osu_specific/pp/bancho";
import Util from "../../../Util";
import { IReplayRenderer } from "../../../osu_specific/replay_render/IReplayRenderer";
import { IssouBestRenderer } from "../../../osu_specific/replay_render/IssouBestRenderer";

export class OsuReplay extends Command {
    renderer: IReplayRenderer;
    constructor(module: SimpleCommandsModule) {
        super(["osu_replay"], module, async (ctx) => {
            const replayFile = await ctx.tgCtx.getFile();
            if (!replayFile?.file_path) {
                return;
            }

            const { data: file } = await axios.get(
                `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${replayFile.file_path}`,
                { responseType: "arraybuffer" }
            );

            const replay = new ReplayParser(file).getReplay();
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

            const needRender = replay.mode == 0;

            const renderAdd = needRender ? "\n\nРендер реплея в процессе..." : "";
            await ctx.reply(module.bot.templates.Replay(replay, beatmap, calculator) + renderAdd, {
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
                    video_url: replayResponse.video_url,
                });
            } else {
                await ctx.reply(`Ошибка при рендере реплея: ${replayResponse.error}`);
            }
        });

        this.renderer = new IssouBestRenderer();
    }

    check(name: string, ctx: UnifiedMessageContext): boolean {
        if (!ctx.hasAttachments("doc")) {
            return false;
        }
        const replays = ctx.getAttachments("doc").filter((d) => d.file_name?.endsWith(".osr"));
        return replays.length > 0;
    }
}

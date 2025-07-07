import fs from "fs";
import { ScoreDecoder } from "osu-parsers";
import { Command } from "../../Command";
import { SimpleCommandsModule } from "./index";
import UnifiedMessageContext from "../../../TelegramSupport";
import Util from "../../../Util";
import { IReplayRenderer, RenderSettings } from "../../../osu_specific/replay_render/IReplayRenderer";
import { IssouBestRenderer } from "../../../osu_specific/replay_render/IssouBestRenderer";
import { OsrReplay } from "../../../osu_specific/OsrReplay";
import { ExperimentalRenderer } from "../../../osu_specific/replay_render/ExperimentalRenderer";
import { InputFile } from "grammy";
import BanchoPP from "../../../osu_specific/pp/bancho";

export class OsuReplay extends Command {
    renderer: IReplayRenderer;
    experimental_renderer: IReplayRenderer;
    rate = {};

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
                    await ctx.reply(ctx.tr("file-is-too-big-render"));
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

            const keyboard = Util.createKeyboard(
                [
                    ["B", "s"],
                    ["G", "g"],
                    ["R", "r"],
                ].map((group) => [
                    {
                        text: `[${group[0]}] ${ctx.tr("my-score-on-map-button")}`,
                        command: `${group[1]} c ${Util.getModeArg(replay.mode)}`,
                    },
                    ...(ctx.isInGroupChat
                        ? [
                              {
                                  text: `[${group[0]}] ${ctx.tr("chat-map-leaderboard-button")}`,
                                  command: `${group[1]} lb ${Util.getModeArg(replay.mode)}`,
                              },
                          ]
                        : []),
                ])
            );

            const settings = await ctx.userSettings();
            let settingsAllowed = settings.render_enabled || !!ctx.messagePayload;
            if (ctx.isInGroupChat && settingsAllowed && !ctx.messagePayload) {
                const chatSettings = await ctx.chatSettings();
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
                ? "\n\n" + ctx.tr("render-in-progress")
                : ctx.messagePayload
                  ? ctx.tr("cant-render")
                  : "";

            if (canRender && useExperimental) {
                renderAdditional += "\n" + ctx.tr("experimental-renderer-warning");
            }
            let needRender = canRender;
            if (
                needRender &&
                !(useExperimental && ctx.senderId == module.bot.config.tg.owner) // allow admin to use experimental renderer without timeout
            ) {
                if (this.checkLimit(ctx.senderId)) {
                    needRender = false;
                    renderAdditional =
                        "\n\n" +
                        ctx.tr("render-timeout-warning-minutes", {
                            minutes: 5,
                        });
                } else {
                    this.setLimit(ctx.senderId);
                }
            }

            if (needRender) {
                const rendererAvailable = await renderer.available();
                if (!rendererAvailable) {
                    needRender = false;
                    if (fallbackToExperimental) {
                        renderAdditional = "\n\n" + ctx.tr("experimental-gamemode-unavailable");
                    } else {
                        const rendererName = settings.render_enabled ? "experimental" : "o!rdr";
                        renderAdditional =
                            "\n\n" +
                            ctx.tr("renderer-unavailable", {
                                renderer: rendererName,
                            });
                    }

                    this.removeLimit(ctx.senderId);
                }
            }

            const renderHeader =
                ctx.tr("player-name", {
                    player_name: replay.player,
                }) + "\n\n";

            let fullBody = renderAdditional.trim();
            let cover: string | InputFile;
            if (!ctx.messagePayload) {
                if (await ctx.preferCardsOutput()) {
                    cover = new InputFile(await module.bot.okiChanCards.generateScoreCard(replay, beatmap, ctx));
                    const beatmapUrl = `https://osu.ppy.sh/b/${beatmap.id}`;
                    fullBody = `${ctx.tr("score-beatmap-link")}: ${beatmapUrl}` + renderAdditional;
                } else {
                    const ppCalc = new BanchoPP(beatmap, replay.mods);
                    if (beatmap.coverUrl) {
                        cover = await module.bot.database.covers.getPhotoDoc(beatmap.coverUrl);
                    } else {
                        cover = await module.bot.database.covers.getCover(beatmap.setId);
                    }
                    fullBody =
                        renderHeader +
                        module.bot.templates.ScoreFull(ctx, replay, beatmap, ppCalc, "https://osu.ppy.sh") +
                        renderAdditional;
                }
            }

            await ctx.reply(fullBody, {
                photo: !ctx.messagePayload ? cover : undefined,
                keyboard: !ctx.messagePayload ? keyboard : undefined,
            });
            module.bot.maps.setMap(ctx.chatId, beatmap);

            if (!needRender) {
                return;
            }

            const renderSettings: RenderSettings = {
                skin: settings.ordr_skin,
                video: settings.ordr_video,
                storyboard: settings.ordr_storyboard,
                dim: settings.ordr_bgdim,
                pp_counter: settings.ordr_pp_counter,
                ur_counter: settings.ordr_ur_counter,
                hit_counter: settings.ordr_hit_counter,
                strain_graph: settings.ordr_strain_graph,
                isSkinCustom: settings.ordr_is_skin_custom,
                masterVolume: settings.ordr_master_volume,
                musicVolume: settings.ordr_music_volume,
                effectsVolume: settings.ordr_effects_volume,
            };

            await this.module.bot.database.statsModel.logRenderStart(ctx, renderSettings, replay.mode, useExperimental);
            const replayResponse = await renderer.render(file, renderSettings);

            if (replayResponse.success) {
                await this.module.bot.database.statsModel.logRenderSuccess(
                    ctx,
                    renderSettings,
                    replay.mode,
                    useExperimental
                );
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
                await this.module.bot.database.statsModel.logRenderFailed(
                    ctx,
                    renderSettings,
                    replay.mode,
                    replayResponse.error,
                    useExperimental
                );
                if (replayResponse.error.includes("This replay is already rendering or in queue")) {
                    let text = ctx.tr("already-rendering-warning");
                    if (ctx.isInGroupChat) {
                        text += "\n\n";
                        text += ctx.tr("already-rendering-warning-chat");
                    }
                    await ctx.reply(text, {
                        keyboard: Util.createKeyboard([
                            [{ text: ctx.tr("chat-settings-button"), command: "osu settings" }],
                        ]),
                    });
                } else {
                    await ctx.reply(
                        ctx.tr("render-error-text", {
                            error: replayResponse.error,
                        })
                    );
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

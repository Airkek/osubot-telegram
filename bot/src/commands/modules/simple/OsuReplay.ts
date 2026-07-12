import { IMessageContext } from "core/IMessageContext";
import { MediaFile } from "core/MediaFile";
import fs from "fs/promises";
import { Command } from "commands/Command";
import { SimpleCommandsModule } from "commands/modules/simple/SimpleCommandsModule";
import { Util } from "shared/Util";
import { IKeyboard } from "presentation/keyboard/IKeyboard";
import { makeKeyboard } from "presentation/keyboard/makeKeyboard";
import { IReplayRenderer } from "games/osu/replays/rendering/IReplayRenderer";
import { IRenderSettings } from "games/osu/replays/rendering/IRenderSettings";
import { IssouBestRenderer } from "games/osu/replays/rendering/IssouBestRenderer";
import { OsrReplay } from "games/osu/replays/OsrReplay";
import { ExperimentalRenderer } from "games/osu/replays/rendering/ExperimentalRenderer";
import { decodeReplay, readReplayHeader } from "games/osu/performance/OfficialCalculator";

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
                    file = await fs.readFile(localPath);
                } finally {
                    await ctx.removeFile();
                }
            }

            const header = await readReplayHeader(file);
            const beatmap = await module.bot.osuBeatmapProvider.getBeatmapByHash(header.beatmap_hash, header.mode);
            const replay = new OsrReplay(await decodeReplay(file, beatmap));
            await beatmap.applyMods(replay.mods);

            const keyboard = makeKeyboard(
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
                !(useExperimental && ctx.isFromOwner) // allow admin to use experimental renderer without timeout
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

            if (needRender && replay.frameCount < 1) {
                renderAdditional = "\n\n" + ctx.tr("renderer-no-replay-frames");
                needRender = false;
                this.removeLimit(ctx.senderId);
            }

            if (needRender) {
                const rendererAvailable = await renderer.available();
                if (!rendererAvailable) {
                    needRender = false;
                    if (fallbackToExperimental) {
                        renderAdditional = "\n\n" + ctx.tr("experimental-gamemode-unavailable");
                    } else {
                        const rendererName = useExperimental ? "experimental" : "o!rdr";
                        renderAdditional =
                            "\n\n" +
                            ctx.tr("renderer-unavailable", {
                                renderer: rendererName,
                            });
                    }

                    this.removeLimit(ctx.senderId);
                }
            }

            const maxSongLengthMinutes = 15;
            if (needRender && beatmap.stats.length > maxSongLengthMinutes * 60) {
                renderAdditional =
                    "\n\n" +
                    ctx.tr("renderer-max-length-exceeded", {
                        max_minutes: maxSongLengthMinutes,
                    });
                needRender = false;
                this.removeLimit(ctx.senderId);
            }

            let maxStarrate: number;
            switch (beatmap.mode) {
                case 0:
                case 1:
                case 2:
                case 3:
                default:
                    // TODO: adjust by mode and renderer
                    maxStarrate = 20;
                    break;
            }
            if (needRender && beatmap.stats.stars > maxStarrate) {
                renderAdditional =
                    "\n\n" +
                    ctx.tr("renderer-max-starrate-exceeded", {
                        max_stars: maxStarrate,
                    });
                needRender = false;
                this.removeLimit(ctx.senderId);
            }

            const renderHeader =
                ctx.tr("player-name", {
                    player_name: replay.player,
                }) + "\n\n";

            let fullBody = renderAdditional.trim();
            let cover: MediaFile;
            if (!ctx.messagePayload) {
                const replyData = await this.module.bot.replies.scoreData(
                    ctx,
                    ctx,
                    replay,
                    beatmap,
                    "https://osu.ppy.sh"
                );
                fullBody = renderHeader + replyData.text + renderAdditional;
                cover = replyData.photo;
            }

            await ctx.reply(fullBody, {
                photo: !ctx.messagePayload ? cover : undefined,
                keyboard: !ctx.messagePayload ? keyboard : undefined,
            });
            module.bot.chatBeatmaps.setMap(ctx.chatId, beatmap);

            if (!needRender) {
                return;
            }

            const renderSettings: IRenderSettings = {
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

            await this.module.bot.storage.telemetry.logRenderStart(ctx, replay.mode, useExperimental);
            const replayResponse = await renderer.render(file, renderSettings);

            if (replayResponse.success) {
                await this.module.bot.storage.telemetry.logRenderSuccess(ctx, replay.mode, useExperimental);
                await ctx.reply("", {
                    video: {
                        url: replayResponse.video.url,
                        width: replayResponse.video.width,
                        height: replayResponse.video.height,
                        duration: Math.ceil(beatmap.stats.length),
                    },
                });
            } else {
                await this.module.bot.storage.telemetry.logRenderFailed(
                    ctx,
                    replay.mode,
                    replayResponse.error,
                    useExperimental
                );
                this.removeLimit(ctx.senderId);
                if (replayResponse.error.includes("This replay is already rendering or in queue")) {
                    let text = ctx.tr("already-rendering-warning");
                    let keyboard: IKeyboard = undefined;
                    if (ctx.isInGroupChat) {
                        text += "\n\n";
                        text += ctx.tr("already-rendering-warning-chat");
                        keyboard = [[{ text: ctx.tr("chat-settings-button"), command: "osu settings" }]];
                    }
                    await ctx.reply(text, {
                        keyboard: keyboard,
                    });
                } else if (replayResponse.error.includes("This player is banned from o!rdr")) {
                    await ctx.reply(ctx.tr("ordr-ban-warning"));
                } else if (replayResponse.error.includes("o!rdr is not ready to take render jobs at the moment")) {
                    const rendererName = useExperimental ? "experimental" : "o!rdr";
                    await ctx.reply(
                        ctx.tr("renderer-unavailable", {
                            renderer: rendererName,
                        })
                    );
                } else if (replayResponse.error.includes("This skin does not exist")) {
                    const settings = await ctx.userSettings(true);
                    settings.ordr_skin = "whitecatCK1.0";
                    settings.ordr_is_skin_custom = false;
                    await ctx.updateUserSettings(settings);
                    await ctx.reply(ctx.tr("renderer-unknown-skin-restored-default"));
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

    check(name: string, ctx: IMessageContext): boolean {
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

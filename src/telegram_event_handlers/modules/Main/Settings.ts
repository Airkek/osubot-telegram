import { Command } from "../../Command";
import { Module } from "../Module";
import { InlineKeyboard } from "grammy";
import Util, { IKBButton } from "../../../Util";
import UnifiedMessageContext from "../../../TelegramSupport";
import { UserSettings } from "../../../Database";

type SettingsPage = "home" | "render";
type ToggleableSettingsKey =
    | "render_enabled"
    | "ordr_video"
    | "ordr_storyboard"
    | "ordr_pp_counter"
    | "ordr_ur_counter"
    | "ordr_hit_counter"
    | "ordr_strain_graph";

type GenericSettingsKey = "ordr_skin" | "ordr_bgdim";

function buildEvent(userId: number, event: string): string {
    return `osu settings ${userId}:${event}`;
}

function buildToggleEvent(userId: number, page: SettingsPage, key: ToggleableSettingsKey, currValue: boolean) {
    return buildEvent(userId, `setbool:${page}:${key}:${currValue ? "0" : "1"}`);
}

function buildSetEvent(userId: number, page: SettingsPage, key: GenericSettingsKey) {
    return buildEvent(userId, `set:${page}:${key}`);
}

function buildPageEvent(userId: number, page: SettingsPage) {
    return buildEvent(userId, `page:${page}`);
}

function buildStartKeyboard(userId: number): InlineKeyboard {
    return Util.createKeyboard([
        [
            {
                text: "🎥Рендер",
                command: buildPageEvent(userId, "render"),
            },
        ],
    ]);
}

function buildLeveledPageKeyboard(userId: number, previousPage: SettingsPage, rows: IKBButton[][]) {
    rows.push([
        {
            text: "⬅️Назад",
            command: buildPageEvent(userId, previousPage),
        },
    ]);
    return Util.createKeyboard(rows);
}

function bToS(val: boolean): string {
    const enabled = "✅";
    const disabled = "❌";
    return val ? enabled : disabled;
}

function toggleableButton(
    userId: number,
    page: SettingsPage,
    name: string,
    key: ToggleableSettingsKey,
    val: boolean
): IKBButton {
    return {
        text: `${bToS(val)}${name}`,
        command: buildToggleEvent(userId, page, key, val),
    };
}

function genericButton(
    userId: number,
    page: SettingsPage,
    name: string,
    key: GenericSettingsKey,
    valRepresentation: string
): IKBButton {
    return {
        text: `${name}: ${valRepresentation}`,
        command: buildSetEvent(userId, page, key),
    };
}

function buildRenderPage(settings: UserSettings): InlineKeyboard {
    const page = "render";
    return buildLeveledPageKeyboard(settings.user_id, "home", [
        [toggleableButton(settings.user_id, page, "Рендер реплеев", "render_enabled", settings.render_enabled)],
        [
            toggleableButton(settings.user_id, page, "Фоновое видео", "ordr_video", settings.ordr_video),
            toggleableButton(settings.user_id, page, "Сториборд", "ordr_storyboard", settings.ordr_storyboard),
        ],
        [genericButton(settings.user_id, page, "Затемнение фона", "ordr_bgdim", settings.ordr_bgdim.toString() + "%")],
        [
            toggleableButton(settings.user_id, page, "Счётчик PP", "ordr_pp_counter", settings.ordr_pp_counter),
            toggleableButton(settings.user_id, page, "Счётчик UR", "ordr_ur_counter", settings.ordr_ur_counter),
        ],
        [
            toggleableButton(
                settings.user_id,
                page,
                "Счётчик попаданий",
                "ordr_hit_counter",
                settings.ordr_hit_counter
            ),
            toggleableButton(
                settings.user_id,
                page,
                "График сложности",
                "ordr_strain_graph",
                settings.ordr_strain_graph
            ),
        ],
    ]);
}

export default class SettingsCommand extends Command {
    constructor(module: Module) {
        super(["settings", "ыуеештпы"], module, async (ctx: UnifiedMessageContext, self, args) => {
            if (!ctx.messagePayload) {
                await ctx.reply(`Настройки:`, {
                    keyboard: buildStartKeyboard(ctx.senderId),
                });
                return;
            }

            const eventParams = args.fullString.split(":");
            if (eventParams.length < 2) {
                return;
            }

            if (eventParams[0] != ctx.senderId.toString()) {
                await ctx.answer("Это не твои настройки!");
                return;
            }

            const settings = await this.module.bot.database.userSettings.getUserSettings(ctx.senderId);

            const showPage = async (
                page: SettingsPage,
                newMessage: boolean = false,
                customCtx: UnifiedMessageContext = ctx
            ) => {
                let answer: InlineKeyboard = undefined;
                switch (page) {
                    case "home": {
                        answer = buildStartKeyboard(customCtx.senderId);
                        break;
                    }
                    case "render": {
                        answer = buildRenderPage(settings);
                        break;
                    }
                }

                if (newMessage) {
                    await customCtx.reply("Настройки:", {
                        keyboard: answer,
                    });
                    return;
                }
                await customCtx.editMarkup(answer);
            };

            switch (eventParams[1]) {
                case "setbool": {
                    const page = eventParams[2] as SettingsPage;
                    const key = eventParams[3] as ToggleableSettingsKey;
                    const value = Number(eventParams[4]) == 1;

                    let allowUpdate = false;
                    switch (key) {
                        case "render_enabled":
                        case "ordr_video":
                        case "ordr_storyboard":
                        case "ordr_pp_counter":
                        case "ordr_ur_counter":
                        case "ordr_hit_counter":
                        case "ordr_strain_graph": {
                            settings[key] = value;
                            allowUpdate = true;
                            break;
                        }
                    }
                    if (allowUpdate) {
                        await self.module.bot.database.userSettings.updateSettings(settings);
                        await showPage(page);
                    }
                    break;
                }
                case "set": {
                    const page = eventParams[2] as SettingsPage;
                    const key = eventParams[3] as GenericSettingsKey;

                    switch (key) {
                        case "ordr_skin": {
                            break;
                        }

                        case "ordr_bgdim": {
                            const msg =
                                'Отправьте число от 0 до 100 чтобы изменить затемнение фона или напишите "отмена" чтобы отменить действие';
                            await ctx.reply(msg);
                            this.module.bot.addCallback(ctx, async (ctx) => {
                                if (!ctx.text) {
                                    await ctx.reply(msg);
                                    return false;
                                }
                                if (ctx.text.trim().toLowerCase() == "отмена") {
                                    await showPage(page, true, ctx);
                                    return true;
                                }

                                const num = Number(ctx.text);
                                if (isNaN(num)) {
                                    await ctx.reply(msg);
                                    return false;
                                }
                                if (num > 100 || num < 0) {
                                    await ctx.reply("Число должно быть находиться в диапазоне от 0 до 100");
                                    return false;
                                }

                                settings.ordr_bgdim = num;
                                await self.module.bot.database.userSettings.updateSettings(settings);
                                await showPage(page, true, ctx);

                                return true;
                            });
                            break;
                        }
                    }
                    break;
                }
                case "page": {
                    await showPage(eventParams[2] as SettingsPage);
                    break;
                }
            }
        });
    }
}

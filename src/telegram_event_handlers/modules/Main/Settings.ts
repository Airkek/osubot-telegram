import { Command } from "../../Command";
import { Module } from "../Module";
import { InlineKeyboard } from "grammy";
import Util, { IKBButton } from "../../../Util";
import UnifiedMessageContext from "../../../TelegramSupport";
import { UserSettings } from "../../../Database";
import { OrdrSkinsProvider } from "../../../osu_specific/replay_render/OrdrSkinsProvider";

type SettingsPageWithPageControl = "skin_sel";
type SettingsPage = "home" | "render" | SettingsPageWithPageControl;
type ToggleableSettingsKey =
    | "render_enabled"
    | "ordr_video"
    | "ordr_storyboard"
    | "ordr_pp_counter"
    | "ordr_ur_counter"
    | "ordr_hit_counter"
    | "ordr_strain_graph";

type GenericSettingsKey = "ordr_skin" | "ordr_bgdim" | "page_number";

function buildEvent(userId: number, event: string): string {
    return `osu settings ${userId}:${event}`;
}

function buildToggleEvent(userId: number, page: SettingsPage, key: ToggleableSettingsKey, currValue: boolean) {
    return buildEvent(userId, `setbool:${page}:${key}:${currValue ? "0" : "1"}`);
}

function buildSetEvent(userId: number, page: SettingsPage, key: GenericSettingsKey, value?: string) {
    const valueAdd = value ? `:${value}` : "";
    return buildEvent(userId, `set:${page}:${key}` + valueAdd);
}

function buildPageEvent(userId: number, page: SettingsPage, pageNum?: number) {
    const pageNumAdd = pageNum !== undefined ? `:${pageNum}` : "";
    return buildEvent(userId, `page:${page}` + pageNumAdd);
}

function buildPageButton(userId: number, page: SettingsPage, text: string, pageNum?: number): IKBButton {
    return {
        text,
        command: buildPageEvent(userId, page, pageNum),
    };
}

function buildPlaceholderButton(text: string): IKBButton {
    return {
        text,
        command: "nothing",
    };
}

function buildStartKeyboard(userId: number): InlineKeyboard {
    return Util.createKeyboard([[buildPageButton(userId, "render", "🎥Рендер")]]);
}

function buildCancelKeyboard(userId: number, page: SettingsPage, ticket: string): InlineKeyboard {
    return Util.createKeyboard([
        [
            {
                text: "❌Отмена",
                command: buildEvent(userId, `cancel:${ticket}:${page}`),
            },
        ],
    ]);
}

function buildLeveledPageKeyboard(userId: number, previousPage: SettingsPage, rows: IKBButton[][]) {
    rows.push([buildPageButton(userId, previousPage, "⬅️Назад")]);
    return Util.createKeyboard(rows);
}

function buildPaginationControl(
    userId: number,
    page: SettingsPageWithPageControl,
    currentPage: number,
    maxPage: number
): IKBButton[] {
    const backwardEmoji = "◀️";
    const forwardEmoji = "▶️";
    const backward =
        currentPage > 1
            ? buildPageButton(userId, page, backwardEmoji, currentPage - 1)
            : buildPlaceholderButton(backwardEmoji);
    const forward =
        currentPage < maxPage
            ? buildPageButton(userId, page, forwardEmoji, currentPage + 1)
            : buildPlaceholderButton(forwardEmoji);
    return [
        backward,
        {
            text: `🖊️${currentPage}/${maxPage}`,
            command: buildSetEvent(userId, page, "page_number"),
        },
        forward,
    ];
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

function genericSetButton(
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
        [buildPageButton(settings.user_id, "skin_sel", `Скин: ${settings.ordr_skin}`)],
        [
            genericSetButton(
                settings.user_id,
                page,
                "Затемнение фона",
                "ordr_bgdim",
                settings.ordr_bgdim.toString() + "%"
            ),
        ],
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

const skinsProvider = new OrdrSkinsProvider();
async function buildSkinSelector(settings: UserSettings, pageNum: number): Promise<InlineKeyboard> {
    const page: SettingsPage = "skin_sel";

    const res = await skinsProvider.getPage(pageNum);

    const buttons = res.skins.map((val) => {
        return [
            {
                text: `${val.id == settings.ordr_skin ? "✅" : ""}${val.id}: ${val.name}`,
                command: buildSetEvent(settings.user_id, page, "ordr_skin", `set:${val.id}`),
            },
        ];
    });

    buttons.push([
        {
            text: `✍️Указать id скина вручную`,
            command: buildSetEvent(settings.user_id, "render", "ordr_skin", "request"),
        },
    ]);

    buttons.push(buildPaginationControl(settings.user_id, page, pageNum, res.maxPage));

    return buildLeveledPageKeyboard(settings.user_id, "render", buttons);
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
                pageNumber?: number,
                newMessage: boolean = false,
                customCtx: UnifiedMessageContext = ctx
            ) => {
                let answer: InlineKeyboard = undefined;
                switch (page) {
                    case "home": {
                        answer = buildStartKeyboard(settings.user_id);
                        break;
                    }
                    case "render": {
                        answer = buildRenderPage(settings);
                        break;
                    }
                    case "skin_sel": {
                        answer = await buildSkinSelector(settings, pageNumber ?? 1);
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
                    const value = Number(eventParams[4]) === 1;

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

                    let allowUpdate = false;
                    switch (key) {
                        case "page_number": {
                            const page = eventParams[4] as SettingsPageWithPageControl;
                            const msg = 'Отправьте id скина из o!rdr или напишите "отмена" чтобы отменить действие';
                            const ticket = this.module.bot.addCallback(ctx, async (ctx) => {
                                if (!ctx.text) {
                                    await ctx.reply(msg);
                                    return false;
                                }
                                if (ctx.text.trim().toLowerCase() == "отмена") {
                                    await showPage(page, undefined, true, ctx);
                                    return true;
                                }

                                const num = Number(ctx.text);
                                if (isNaN(num)) {
                                    await ctx.reply(msg);
                                    return false;
                                }

                                await showPage(page, num, true, ctx);

                                return true;
                            });

                            await ctx.edit(msg, {
                                keyboard: buildCancelKeyboard(settings.user_id, "skin_sel", ticket),
                            });
                            break;
                        }
                        case "ordr_skin": {
                            const action = eventParams[4];
                            if (action == "set") {
                                settings.ordr_skin = Number(eventParams[5]);
                                allowUpdate = true;
                            } else if (action == "request") {
                                const msg = 'Отправьте номер страницы или напишите "отмена" чтобы отменить действие';
                                const ticket = this.module.bot.addCallback(ctx, async (ctx) => {
                                    if (!ctx.text) {
                                        await ctx.reply(msg);
                                        return false;
                                    }
                                    if (ctx.text.trim().toLowerCase() == "отмена") {
                                        await showPage(page, undefined, true, ctx);
                                        return true;
                                    }

                                    const num = Number(ctx.text);
                                    if (isNaN(num)) {
                                        await ctx.reply(msg);
                                        return false;
                                    }

                                    settings.ordr_skin = num;
                                    await self.module.bot.database.userSettings.updateSettings(settings);
                                    await showPage(page, undefined, true, ctx);

                                    return true;
                                });

                                await ctx.edit(msg, {
                                    keyboard: buildCancelKeyboard(settings.user_id, "skin_sel", ticket),
                                });
                            }
                            break;
                        }

                        case "ordr_bgdim": {
                            const msg =
                                'Отправьте число от 0 до 100 чтобы изменить затемнение фона или напишите "отмена" чтобы отменить действие';
                            const ticket = this.module.bot.addCallback(ctx, async (ctx) => {
                                if (!ctx.text) {
                                    await ctx.reply(msg);
                                    return false;
                                }
                                if (ctx.text.trim().toLowerCase() == "отмена") {
                                    await showPage(page, undefined, true, ctx);
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
                                await showPage(page, undefined, true, ctx);

                                return true;
                            });
                            await ctx.edit(msg, {
                                keyboard: buildCancelKeyboard(settings.user_id, "render", ticket),
                            });
                            break;
                        }
                    }

                    if (allowUpdate) {
                        await self.module.bot.database.userSettings.updateSettings(settings);
                        await showPage(page);
                    }
                    break;
                }
                case "cancel": {
                    const ticket = eventParams[2];
                    const page = eventParams[3] as SettingsPage;

                    this.module.bot.removeCallback(ticket);
                    await showPage(page);
                    break;
                }
                case "page": {
                    let page: number = undefined;
                    if (eventParams.length > 3) {
                        page = Number(eventParams[3]);
                    }
                    await showPage(eventParams[2] as SettingsPage, page);
                    break;
                }
            }
        });
    }
}

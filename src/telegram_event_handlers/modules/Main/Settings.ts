import { Command } from "../../Command";
import { Module } from "../Module";
import { IKBButton, IKeyboard } from "../../../Util";
import UnifiedMessageContext from "../../../TelegramSupport";
import { OrdrSkinsProvider } from "../../../osu_specific/replay_render/OrdrSkinsProvider";
import { ILocalisator } from "../../../ILocalisator";
import { ChatSettings } from "../../../data/Models/Settings/ChatSettingsModel";
import { UserSettings } from "../../../data/Models/Settings/UserSettingsModel";

type SettingsPageWithPageControl = "skin_sel";
type SettingsPage = "home" | "render" | "language" | "output_type" | SettingsPageWithPageControl;
type ToggleableSettingsKey =
    | "render_enabled"
    | "ordr_video"
    | "ordr_storyboard"
    | "ordr_pp_counter"
    | "ordr_ur_counter"
    | "ordr_hit_counter"
    | "ordr_strain_graph"
    | "notifications_enabled"
    | "experimental_renderer"
    | "lang_russian"
    | "lang_english"
    | "lang_chinese"
    | "lang_auto"
    | "output_oki_cards"
    | "output_text";

type ChatSettingsPage = "home" | "language";
type ToggleableChatSettingsKey =
    | "render_enabled"
    | "notifications_enabled"
    | "lang_russian"
    | "lang_english"
    | "lang_chinese"
    | "lang_auto";

type GenericSettingsKey =
    | "ordr_skin"
    | "ordr_bgdim"
    | "ordr_master_volume"
    | "ordr_music_volume"
    | "ordr_effects_volume"
    | "page_number";

function buildEvent(userId: number, event: string): string {
    return `osu s ${userId}:${event}`;
}

function buildToggleEvent(userId: number, page: SettingsPage, key: ToggleableSettingsKey, currValue: boolean) {
    return buildEvent(userId, `setbool:${page}:${key}:${currValue ? "0" : "1"}`);
}

function buildChatToggleEvent(
    chatId: number,
    page: ChatSettingsPage,
    key: ToggleableChatSettingsKey,
    currValue: boolean
) {
    return buildEvent(chatId, `setbool:${page}:${key}:${currValue ? "0" : "1"}`);
}

function buildSetEvent(userId: number, page: SettingsPage, key: GenericSettingsKey, value?: string) {
    const valueAdd = value ? `:${value}` : "";
    return buildEvent(userId, `set:${page}:${key}` + valueAdd);
}

function buildPageEvent(userId: number, page: SettingsPage, pageNum?: number) {
    const pageNumAdd = pageNum !== undefined ? `:${pageNum}` : "";
    return buildEvent(userId, `page:${page}` + pageNumAdd);
}

function buildChatPageEvent(userId: number, page: ChatSettingsPage, pageNum?: number) {
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

function buildStartKeyboard(
    userId: number,
    settings: UserSettings,
    showOutputType: boolean,
    l: ILocalisator
): IKeyboard {
    const kb = [
        [buildPageButton(userId, "render", l.tr("render-page"))],
        [
            toggleableButton(
                userId,
                "home",
                l.tr("news-setting"),
                "notifications_enabled",
                settings.notifications_enabled
            ),
        ],
    ];
    if (showOutputType) {
        kb.push([buildPageButton(userId, "output_type", l.tr("output-style-page"))]);
    }
    kb.push([buildPageButton(userId, "language", "🌐Language/Язык")]);

    return kb;
}

function buildCancelKeyboard(userId: number, page: SettingsPage, ticket: string, l: ILocalisator): IKeyboard {
    return [
        [
            {
                text: l.tr("cancel-button"),
                command: buildEvent(userId, `cancel:${ticket}:${page}`),
            },
        ],
    ];
}

function buildLeveledPageKeyboard(userId: number, previousPage: SettingsPage, l: ILocalisator, rows: IKeyboard) {
    rows.push([buildPageButton(userId, previousPage, l.tr("previous-page-button"))]);
    return rows;
}

function buildChatPageButton(chatId: number, page: ChatSettingsPage, text: string, pageNum?: number): IKBButton {
    return {
        text,
        command: buildChatPageEvent(chatId, page, pageNum),
    };
}

function buildChatLeveledPageKeyboard(
    chatId: number,
    previousPage: ChatSettingsPage,
    l: ILocalisator,
    rows: IKeyboard
) {
    rows.push([buildChatPageButton(chatId, previousPage, l.tr("previous-page-button"))]);
    return rows;
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

function toggleableChatButton(
    chatId: number,
    page: ChatSettingsPage,
    name: string,
    key: ToggleableChatSettingsKey,
    val: boolean
): IKBButton {
    return {
        text: `${bToS(val)}${name}`,
        command: buildChatToggleEvent(chatId, page, key, val),
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

function buildChatSettingsKeyboard(settings: ChatSettings, l: ILocalisator): IKeyboard {
    const page: ChatSettingsPage = "home";
    return [
        [toggleableChatButton(settings.chat_id, page, l.tr("auto-render"), "render_enabled", settings.render_enabled)],
        [
            toggleableChatButton(
                settings.chat_id,
                page,
                l.tr("news-setting"),
                "notifications_enabled",
                settings.notifications_enabled
            ),
        ],
        [buildChatPageButton(settings.chat_id, "language", l.tr("chat-language-page"))],
    ];
}

function buildUserLanguagePage(settings: UserSettings, l: ILocalisator): IKeyboard {
    const page: SettingsPage = "language";
    return buildLeveledPageKeyboard(settings.user_id, "home", l, [
        [toggleableButton(settings.user_id, page, "🇷🇺 Русский", "lang_russian", settings.language_override == "ru")],
        [toggleableButton(settings.user_id, page, "🇺🇸 English", "lang_english", settings.language_override == "en")],
        [toggleableButton(settings.user_id, page, "🇨🇳 简体中文", "lang_chinese", settings.language_override == "zh")],
        [
            toggleableButton(
                settings.user_id,
                page,
                "🌐 Auto",
                "lang_auto",
                settings.language_override == "do_not_override"
            ),
        ],
    ]);
}

function buildOutputTypePage(settings: UserSettings, l: ILocalisator): IKeyboard {
    const page: SettingsPage = "output_type";
    return buildLeveledPageKeyboard(settings.user_id, "home", l, [
        [
            toggleableButton(
                settings.user_id,
                page,
                l.tr("output-style-oki-cards"),
                "output_oki_cards",
                settings.content_output == "oki-cards"
            ),
        ],
        [
            toggleableButton(
                settings.user_id,
                page,
                l.tr("output-style-text"),
                "output_text",
                settings.content_output == "legacy-text"
            ),
        ],
    ]);
}

function buildChatLanguagePage(settings: ChatSettings, l: ILocalisator): IKeyboard {
    const page: ChatSettingsPage = "language";
    return buildChatLeveledPageKeyboard(settings.chat_id, "home", l, [
        [
            toggleableChatButton(
                settings.chat_id,
                page,
                "🇷🇺 Русский",
                "lang_russian",
                settings.language_override == "ru"
            ),
        ],
        [
            toggleableChatButton(
                settings.chat_id,
                page,
                "🇺🇸 English",
                "lang_english",
                settings.language_override == "en"
            ),
        ],
        [
            toggleableChatButton(
                settings.chat_id,
                page,
                "🇨🇳 简体中文",
                "lang_chinese",
                settings.language_override == "zh"
            ),
        ],
        [
            toggleableChatButton(
                settings.chat_id,
                page,
                l.tr("chat-language-do-not-override"),
                "lang_auto",
                settings.language_override == "do_not_override"
            ),
        ],
    ]);
}

async function buildRenderPage(settings: UserSettings, l: ILocalisator): Promise<IKeyboard> {
    const page: SettingsPage = "render";

    let skinName: string;
    if (settings.ordr_is_skin_custom) {
        const info = await skinsProvider.getCustomSkinInfo(settings.ordr_skin);
        if (info.found) {
            skinName = info.skinName;
        } else {
            skinName = settings.ordr_skin;
        }

        skinName = "⚙️ " + skinName;
    } else {
        skinName = settings.ordr_skin;
    }

    if (skinName.length > 52) {
        skinName = skinName.slice(0, 51) + "…";
    }

    return buildLeveledPageKeyboard(settings.user_id, "home", l, [
        [toggleableButton(settings.user_id, page, l.tr("auto-render"), "render_enabled", settings.render_enabled)],
        [
            toggleableButton(settings.user_id, page, l.tr("background-video"), "ordr_video", settings.ordr_video),
            toggleableButton(settings.user_id, page, l.tr("storyboard"), "ordr_storyboard", settings.ordr_storyboard),
        ],
        [buildPageButton(settings.user_id, "skin_sel", l.tr("skin-button", { skin: skinName }))],
        [
            genericSetButton(
                settings.user_id,
                page,
                l.tr("master-volume"),
                "ordr_master_volume",
                settings.ordr_master_volume.toString() + "%"
            ),
        ],
        [
            genericSetButton(
                settings.user_id,
                page,
                l.tr("music-volume"),
                "ordr_music_volume",
                settings.ordr_music_volume.toString() + "%"
            ),
            genericSetButton(
                settings.user_id,
                page,
                l.tr("effects-volume"),
                "ordr_effects_volume",
                settings.ordr_effects_volume.toString() + "%"
            ),
        ],
        [
            genericSetButton(
                settings.user_id,
                page,
                l.tr("background-dim"),
                "ordr_bgdim",
                settings.ordr_bgdim.toString() + "%"
            ),
        ],
        ...(settings.experimental_renderer
            ? []
            : [
                  [
                      toggleableButton(
                          settings.user_id,
                          page,
                          l.tr("pp-counter"),
                          "ordr_pp_counter",
                          settings.ordr_pp_counter
                      ),
                      toggleableButton(
                          settings.user_id,
                          page,
                          l.tr("ur-counter"),
                          "ordr_ur_counter",
                          settings.ordr_ur_counter
                      ),
                  ],
                  [
                      toggleableButton(
                          settings.user_id,
                          page,
                          l.tr("hit-counter"),
                          "ordr_hit_counter",
                          settings.ordr_hit_counter
                      ),
                      toggleableButton(
                          settings.user_id,
                          page,
                          l.tr("difficulty-graph"),
                          "ordr_strain_graph",
                          settings.ordr_strain_graph
                      ),
                  ],
              ]),
        [
            toggleableButton(
                settings.user_id,
                page,
                l.tr("prefer-experimental-renderer"),
                "experimental_renderer",
                settings.experimental_renderer
            ),
        ],
    ]);
}

const skinsProvider = new OrdrSkinsProvider();

async function buildSkinSelector(settings: UserSettings, pageNum: number, l: ILocalisator): Promise<IKeyboard> {
    const page: SettingsPage = "skin_sel";

    let buttons: IKeyboard = [];
    let maxPage = undefined as number;
    const res = await skinsProvider.getPage(pageNum);
    maxPage = res.maxPage;
    buttons = res.skins.map((val) => {
        const isSelected =
            !settings.ordr_is_skin_custom &&
            (val.id.toString() == settings.ordr_skin || val.safe_name == settings.ordr_skin);
        return [
            {
                text: `${isSelected ? "✅ " : ""}${val.name}`,
                command: buildSetEvent(settings.user_id, page, "ordr_skin", `set:${val.id}:${pageNum}`),
            },
        ];
    });

    buttons.push([
        {
            text: "✍️ " + l.tr("enter-custom-skin-id"),
            command: buildSetEvent(settings.user_id, "render", "ordr_skin", "request"),
        },
    ]);
    buttons.push(buildPaginationControl(settings.user_id, page, pageNum, maxPage));

    return buildLeveledPageKeyboard(settings.user_id, "render", l, buttons);
}

export default class SettingsCommand extends Command {
    constructor(module: Module) {
        super(["settings", "ыуеештпы", "s", "ы"], module, async (ctx: UnifiedMessageContext, self, args) => {
            const isAdmin = !ctx.isInGroupChat || (await ctx.isSenderAdmin());

            if (!ctx.messagePayload || ctx.messagePayload == "osu settings") {
                if (ctx.isInGroupChat) {
                    if (!isAdmin) {
                        await ctx.reply(ctx.tr("chat-settings-admin-warning"));
                        return;
                    }

                    const stgs = await ctx.chatSettings();
                    await ctx.reply(ctx.tr("chat-settings-header"), {
                        keyboard: buildChatSettingsKeyboard(stgs, ctx),
                    });
                } else {
                    const stgs = await ctx.userSettings();
                    const cardsEnabled = await ctx.checkFeature("oki-cards");
                    await ctx.reply(ctx.tr("user-settings-header"), {
                        keyboard: buildStartKeyboard(ctx.senderId, stgs, cardsEnabled, ctx),
                    });
                }

                return;
            }

            const eventParams = args.fullString.split(":");
            if (eventParams.length < 2) {
                return;
            }

            if (ctx.isInGroupChat) {
                if (!isAdmin) {
                    await ctx.answer(ctx.tr("chat-settings-admin-warning"));
                    return;
                }
                if (eventParams[0] != ctx.chatId.toString()) {
                    await ctx.answer(ctx.tr("chat-settings-other-chat-warning"));
                    return;
                }
            } else {
                if (eventParams[0] != ctx.senderId.toString()) {
                    await ctx.answer(ctx.tr("user-settings-other-user-warning"));
                    return;
                }
            }

            if (ctx.isInGroupChat) {
                const chatSettings = await ctx.chatSettings();

                const showChatPage = async (
                    page: ChatSettingsPage,
                    pageNumber?: number,
                    newMessage: boolean = false,
                    customCtx: UnifiedMessageContext = ctx
                ) => {
                    let answer: IKeyboard = undefined;
                    switch (page) {
                        case "language": {
                            answer = buildChatLanguagePage(chatSettings, customCtx);
                            break;
                        }
                        default:
                        case "home": {
                            answer = buildChatSettingsKeyboard(chatSettings, customCtx);
                            break;
                        }
                    }

                    if (newMessage) {
                        await customCtx.reply(customCtx.tr("chat-settings-header"), {
                            keyboard: answer,
                        });
                        return;
                    }

                    await customCtx.editMarkup(answer);
                };

                switch (eventParams[1]) {
                    case "setbool": {
                        const page: ChatSettingsPage = eventParams[2] as ChatSettingsPage;
                        const key = eventParams[3] as ToggleableChatSettingsKey;
                        const value = Number(eventParams[4]) === 1;
                        let allowUpdate = false;
                        switch (key) {
                            case "render_enabled":
                            case "notifications_enabled": {
                                chatSettings[key] = value;
                                allowUpdate = true;
                                break;
                            }
                            case "lang_auto":
                                chatSettings.language_override = "do_not_override";
                                allowUpdate = value;
                                break;
                            case "lang_english":
                                chatSettings.language_override = "en";
                                allowUpdate = value;
                                break;
                            case "lang_chinese":
                                chatSettings.language_override = "zh";
                                allowUpdate = value;
                                break;
                            case "lang_russian":
                                chatSettings.language_override = "ru";
                                allowUpdate = value;
                                break;
                        }
                        if (allowUpdate) {
                            await ctx.updateChatSettings(chatSettings);
                            await ctx.reactivateLocalisator();
                            await showChatPage(page);
                        }
                        break;
                    }
                    case "page": {
                        let page: number = undefined;
                        if (eventParams.length > 3) {
                            page = Number(eventParams[3]);
                        }
                        await showChatPage(eventParams[2] as ChatSettingsPage, page);
                        break;
                    }
                }

                return;
            }

            const settings = await ctx.userSettings();

            const showPage = async (
                page: SettingsPage,
                pageNumber?: number,
                newMessage: boolean = false,
                customCtx: UnifiedMessageContext = ctx
            ) => {
                let answer: IKeyboard = undefined;
                switch (page) {
                    case "home": {
                        const cardsEnabled = await customCtx.checkFeature("oki-cards");
                        answer = buildStartKeyboard(settings.user_id, settings, cardsEnabled, customCtx);
                        break;
                    }
                    case "render": {
                        answer = await buildRenderPage(settings, customCtx);
                        break;
                    }
                    case "language": {
                        answer = buildUserLanguagePage(settings, customCtx);
                        break;
                    }
                    case "output_type": {
                        answer = buildOutputTypePage(settings, customCtx);
                        break;
                    }
                    case "skin_sel": {
                        answer = await buildSkinSelector(settings, pageNumber ?? 1, customCtx);
                        break;
                    }
                }

                if (newMessage) {
                    await customCtx.reply(customCtx.tr("user-settings-header"), {
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
                        case "ordr_strain_graph":
                        case "notifications_enabled":
                        case "experimental_renderer": {
                            settings[key] = value;
                            allowUpdate = true;
                            break;
                        }
                        case "lang_auto":
                            settings.language_override = "do_not_override";
                            allowUpdate = value;
                            break;
                        case "lang_english":
                            settings.language_override = "en";
                            allowUpdate = value;
                            break;
                        case "lang_chinese":
                            settings.language_override = "zh";
                            allowUpdate = value;
                            break;
                        case "lang_russian":
                            settings.language_override = "ru";
                            allowUpdate = value;
                            break;
                        case "output_oki_cards":
                            settings.content_output = "oki-cards";
                            allowUpdate = value;
                            break;
                        case "output_text":
                            settings.content_output = "legacy-text";
                            allowUpdate = value;
                            break;
                    }
                    if (allowUpdate) {
                        await ctx.updateUserSettings(settings);
                        await ctx.reactivateLocalisator();
                        await showPage(page);
                    }
                    break;
                }
                case "set": {
                    const page = eventParams[2] as SettingsPage;
                    const key = eventParams[3] as GenericSettingsKey;

                    let allowUpdate = false;
                    let pageNum = undefined as number;
                    switch (key) {
                        case "page_number": {
                            const cancelAction = ctx.tr("cancel-action");
                            const msg = ctx.tr("select-page-action", {
                                action: cancelAction,
                            });
                            const ticket = this.module.bot.addCallback(ctx, async (ctx) => {
                                if (!ctx.text) {
                                    await ctx.reply(msg);
                                    return false;
                                }
                                if (ctx.text.trim().toLowerCase() == cancelAction) {
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
                                keyboard: buildCancelKeyboard(settings.user_id, "skin_sel", ticket, ctx),
                            });
                            break;
                        }
                        case "ordr_skin": {
                            const action = eventParams[4];
                            if (action == "set") {
                                const id = Number(eventParams[5]);
                                pageNum = Number(eventParams[6]);
                                settings.ordr_skin = await skinsProvider.getSkinByIdAndPage(pageNum, id);
                                settings.ordr_is_skin_custom = false;
                                allowUpdate = true;
                            } else if (action == "request") {
                                const cancelAction = ctx.tr("cancel-action");
                                const msg = ctx.tr("enter-custom-skin-id-action", {
                                    action: cancelAction,
                                    ordr_upload_skin_url: "https://ordr.issou.best/skinupload",
                                });
                                const ticket = this.module.bot.addCallback(ctx, async (ctx) => {
                                    if (!ctx.text) {
                                        await ctx.reply(msg);
                                        return false;
                                    }
                                    if (ctx.text.trim().toLowerCase() == cancelAction) {
                                        await showPage(page, undefined, true, ctx);
                                        return true;
                                    }
                                    if (
                                        ctx.text.includes(" ") ||
                                        ctx.text.includes("&") ||
                                        ctx.text.includes("?") ||
                                        ctx.text.includes("/")
                                    ) {
                                        await ctx.reply(ctx.tr("invalid-skin-id-value"));
                                        return false;
                                    }

                                    const id = encodeURIComponent(ctx.text);

                                    const info = await skinsProvider.getCustomSkinInfo(id);
                                    if (!info.found) {
                                        await ctx.reply(ctx.tr("custom-skin-not-found"));
                                        return false;
                                    }

                                    if (info.removed) {
                                        await ctx.reply(ctx.tr("custom-skin-removed"));
                                        return false;
                                    }

                                    settings.ordr_skin = id;
                                    settings.ordr_is_skin_custom = true;

                                    await ctx.reply(
                                        ctx.tr("custom-skin-success", {
                                            skin_name: info.skinName,
                                        })
                                    );

                                    await ctx.updateUserSettings(settings);
                                    await showPage(page, undefined, true, ctx);

                                    return true;
                                });

                                await ctx.edit(msg, {
                                    keyboard: buildCancelKeyboard(settings.user_id, "skin_sel", ticket, ctx),
                                });
                            }
                            break;
                        }

                        case "ordr_bgdim":
                        case "ordr_master_volume":
                        case "ordr_music_volume":
                        case "ordr_effects_volume": {
                            const cancelAction = ctx.tr("cancel-action");
                            const msgError = ctx.tr("invalid-percent-value");
                            let msg: string;
                            let settingsKey: string;
                            switch (key) {
                                case "ordr_bgdim": {
                                    msg = ctx.tr("enter-bgdim-action", {
                                        action: cancelAction,
                                    });
                                    settingsKey = "ordr_bgdim";
                                    break;
                                }

                                case "ordr_master_volume": {
                                    msg = ctx.tr("enter-master-volume-action", {
                                        action: cancelAction,
                                    });
                                    settingsKey = "ordr_master_volume";
                                    break;
                                }

                                case "ordr_music_volume": {
                                    msg = ctx.tr("enter-music-volume-action", {
                                        action: cancelAction,
                                    });
                                    settingsKey = "ordr_music_volume";
                                    break;
                                }

                                case "ordr_effects_volume": {
                                    msg = ctx.tr("enter-effects-volume-action", {
                                        action: cancelAction,
                                    });
                                    settingsKey = "ordr_effects_volume";
                                    break;
                                }
                            }

                            const ticket = this.module.bot.addCallback(ctx, async (ctx) => {
                                if (!ctx.text) {
                                    await ctx.reply(msg);
                                    return false;
                                }
                                if (ctx.text.trim().toLowerCase() == cancelAction) {
                                    await showPage(page, undefined, true, ctx);
                                    return true;
                                }

                                const num = Number(ctx.text);
                                if (isNaN(num)) {
                                    await ctx.reply(msg);
                                    return false;
                                }
                                if (num > 100 || num < 0) {
                                    await ctx.reply(msgError);
                                    return false;
                                }

                                settings[settingsKey] = num;
                                await ctx.updateUserSettings(settings);
                                await showPage(page, undefined, true, ctx);

                                return true;
                            });
                            await ctx.edit(msg, {
                                keyboard: buildCancelKeyboard(settings.user_id, "render", ticket, ctx),
                            });
                            break;
                        }
                    }

                    if (allowUpdate) {
                        await ctx.updateUserSettings(settings);
                        await showPage(page, pageNum);
                    }
                    break;
                }
                case "cancel": {
                    const ticket = eventParams[2];
                    const page = eventParams[3] as SettingsPage;

                    this.module.bot.removeCallback(ticket);
                    await ctx.remove();
                    await showPage(page, undefined, true);
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

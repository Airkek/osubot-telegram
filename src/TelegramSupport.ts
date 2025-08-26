import { Api, Context, InlineKeyboard, InputFile, InputMediaBuilder } from "grammy";
import { MessageEntity, UserFromGetMe } from "@grammyjs/types";
import { FileApiFlavor, FileFlavor } from "@grammyjs/files";
import { I18nFlavor } from "@grammyjs/i18n";
import fs from "fs";
import { ILocalisator, TranslateFunction, TranslationVariables } from "./ILocalisator";
import { UserSettings } from "./data/Models/Settings/UserSettingsModel";
import { ChatSettings } from "./data/Models/Settings/ChatSettingsModel";
import { Language } from "./data/Models/Settings/SettingsTypes";
import Database from "./data/Database";
import { ControllableFeature } from "./data/Models/FeatureControlModel";
import TextLinkMessageEntity = MessageEntity.TextLinkMessageEntity;
import { IKeyboard } from "./Util";

export type TgContext = FileFlavor<Context & I18nFlavor>;
export type TgApi = FileApiFlavor<Api>;

class ReplyToMessage {
    readonly text: string;
    readonly senderId: number;
    readonly chatId: number;

    constructor(ctx: TgContext) {
        this.text = ctx.message.reply_to_message.text;
        this.senderId = ctx.message.reply_to_message.from.id;
        this.chatId = ctx.message.reply_to_message.chat.id;
    }
}

interface IVideoMeta {
    url: string;
    width: number;
    height: number;
    duration: number;
}

export interface SendOptions {
    keyboard?: IKeyboard;
    photo?: string | InputFile;
    video?: IVideoMeta;
    dont_parse_links?: boolean;
}

const registry = new FinalizationRegistry((path: string) => {
    if (!fs.existsSync(path)) {
        return;
    }
    global.logger.warn(`Removing file ${path} after destructing object`);
    try {
        fs.rmSync(path);
    } catch {
        global.logger.fatal(`Failed to remove file: ${path}`);
    }
});

export default class UnifiedMessageContext implements ILocalisator {
    readonly chatId: number;
    readonly senderId: number;

    readonly plainText?: string;
    readonly plainPayload?: string;

    readonly replyMessage?: ReplyToMessage;

    readonly isInGroupChat: boolean;

    private readonly tgCtx: TgContext;
    private readonly me: UserFromGetMe;
    private readonly localServer: boolean;
    private readonly database: Database;

    private tmpFile?: string;
    private registryToken?: object;

    private userSettingsCache: UserSettings;
    private chatSettingsCache: ChatSettings;

    private isLocalisatorActivated: boolean = false;
    private language: Language = undefined;
    internalTranslate: TranslateFunction = undefined;

    tr(key: string, vars?: TranslationVariables) {
        if (this.isLocalisatorActivated) {
            return this.internalTranslate(key, vars);
        }

        return `Error: Translation context is not activated. Please, report this to developer. Translation key: '${key}'.`;
    }

    private readonly ownerId: number;
    get isFromOwner(): boolean {
        return this.senderId == this.ownerId;
    }

    private graphicalModeOverride: "no" | "cards" | "plain" = "no";

    constructor(ctx: TgContext, ownerId: number, me: UserFromGetMe, isLocal: boolean, database: Database) {
        this.tgCtx = ctx;
        this.me = me;
        this.localServer = isLocal;
        this.database = database;

        this.plainText = ctx.message?.text ?? ctx.message?.caption;
        this.plainPayload = ctx.callbackQuery?.data;
        this.replyMessage = ctx.message?.reply_to_message ? new ReplyToMessage(ctx) : undefined;
        this.isInGroupChat = ctx.chat.type == "supergroup" || ctx.chat.type == "group";
        this.senderId = ctx.from.id;
        this.chatId = ctx.chatId;
        this.ownerId = ownerId;

        this.parsePayload();
    }

    private overridenText: string = undefined;
    get text(): string {
        return this.overridenText ?? this.plainText;
    }

    private overridenPayload: string = undefined;
    get messagePayload(): string {
        return this.overridenPayload ?? this.plainPayload;
    }

    applyTextOverrides(aliases: Record<string, string>) {
        const text = this.text;
        if (!text) {
            return;
        }
        const lowerText = text.toLowerCase();
        for (const [alias, command] of Object.entries(aliases)) {
            const lowerOverride = alias.toLowerCase();

            if (lowerText.startsWith(lowerOverride)) {
                if (text.length === alias.length || /^\s$/.test(text.charAt(alias.length))) {
                    this.overridenText = (command + " " + text.slice(alias.length).trim()).trim();
                    return;
                }
            }
        }
    }

    private parsePayload() {
        if (!this.plainPayload?.startsWith("^")) {
            return;
        }

        const payloadSplit = this.plainPayload.slice(1).split("^");
        if (payloadSplit.length < 2) {
            this.overridenPayload = payloadSplit[0];
            return;
        }

        //g1^payload payload payload (this payload too!! ->> ^ <<- payload!!!)
        const payload = [];
        let argsEnded = false;
        for (const string of payloadSplit) {
            if (!argsEnded) {
                if (string.startsWith("g") && string.length == 2) {
                    const mode = Number(string.slice(1));
                    if (mode == 1) {
                        this.graphicalModeOverride = "plain";
                    } else if (mode == 2) {
                        this.graphicalModeOverride = "cards";
                    }
                } else {
                    argsEnded = true;
                }
            }

            if (argsEnded) {
                payload.push(string);
            }
        }

        this.overridenPayload = payload.join("^");
    }

    private async prepareButtonPayloadPrefix(): Promise<string> {
        const ctxData = [];
        if (await this.preferCardsOutput()) {
            ctxData.push("g2");
        } else {
            ctxData.push("g1");
        }

        return "^" + ctxData.join("^") + "^";
    }

    private async createKeyboard(rows: IKeyboard): Promise<InlineKeyboard> {
        if (!rows || rows.length == 0) {
            return undefined;
        }

        const payloadPrefix = await this.prepareButtonPayloadPrefix();
        const buttonRows = rows.map((row) =>
            row.map((button) => InlineKeyboard.text(button.text, payloadPrefix + button.command))
        );
        return InlineKeyboard.from(buttonRows);
    }

    async activateLocalisator() {
        if (this.isLocalisatorActivated) {
            return;
        }

        if (this.isInGroupChat) {
            const chatSettings = await this.chatSettings();
            if (chatSettings.language_override != "do_not_override") {
                this.language = chatSettings.language_override;
            }
        }

        if (!this.language) {
            const userSettings = await this.userSettings();
            if (userSettings.language_override != "do_not_override") {
                this.language = userSettings.language_override;
            }
        }

        if (this.language) {
            this.tgCtx.i18n.useLocale(this.language);
        }

        this.internalTranslate = this.tgCtx.translate;
        this.isLocalisatorActivated = true;
    }

    async reactivateLocalisator() {
        this.isLocalisatorActivated = false;
        this.language = undefined;
        await this.activateLocalisator();
    }

    public async checkFeature(feature: ControllableFeature) {
        if (this.isFromOwner) {
            const allFeatures = await this.database.featureControlModel.isFeatureEnabled("admin-all-features");
            if (allFeatures) {
                return true;
            }
        }

        return await this.database.featureControlModel.isFeatureEnabled(feature);
    }

    async preferCardsOutput(): Promise<boolean> {
        const cardsEnabled = await this.checkFeature("oki-cards");
        if (!cardsEnabled) {
            return false;
        }

        if (this.graphicalModeOverride != "no") {
            return this.graphicalModeOverride == "cards";
        }

        const settings = await this.userSettings();
        return settings.content_output == "oki-cards";
    }

    async userSettings(): Promise<UserSettings> {
        if (!this.userSettingsCache) {
            this.userSettingsCache = await this.database.userSettings.getUserSettings(this.senderId);
        }

        return this.userSettingsCache;
    }

    async chatSettings(): Promise<ChatSettings> {
        if (!this.isInGroupChat) {
            return undefined;
        }

        if (!this.chatSettingsCache) {
            this.chatSettingsCache = await this.database.chatSettings.getChatSettings(this.chatId);
        }

        return this.chatSettingsCache;
    }

    async updateUserSettings(settings: UserSettings) {
        if (settings.user_id != this.senderId) {
            return;
        }
        await this.database.userSettings.updateSettings(settings);
        this.userSettingsCache = settings;
    }

    async updateChatSettings(settings: ChatSettings) {
        if (!this.isInGroupChat || settings.chat_id != this.chatId) {
            return;
        }
        await this.database.chatSettings.updateSettings(settings);
        this.chatSettingsCache = settings;
    }

    async reply(text: string, options?: SendOptions) {
        const callbackReplyTo = this.tgCtx.callbackQuery?.from.username
            ? `@${this.tgCtx.callbackQuery.from.username}`
            : this.tgCtx.callbackQuery?.from.first_name;

        const isMessage = this.tgCtx.message !== undefined;
        return await this.send(
            isMessage ? text : `${callbackReplyTo},\n${text}`,
            options,
            isMessage ? this.tgCtx.message.message_id : undefined
        );
    }

    async send(text: string, options?: SendOptions, replyTo?: number) {
        try {
            const keyboard = await this.createKeyboard(options?.keyboard);
            if (options?.photo) {
                return await this.tgCtx.replyWithPhoto(options.photo, {
                    caption: text,
                    reply_parameters: {
                        message_id: replyTo,
                    },
                    reply_markup: keyboard,
                });
            }

            if (options?.video) {
                const video = InputMediaBuilder.video(new InputFile(new URL(options.video.url)), {
                    width: options.video.width,
                    height: options.video.height,
                    duration: options.video.duration,
                    supports_streaming: true,
                    caption: text,
                });
                const sent = await this.tgCtx.api.sendMediaGroup(this.tgCtx.chatId, [video], {
                    reply_parameters: {
                        message_id: replyTo,
                    },
                });
                return sent[0];
            }

            return await this.tgCtx.api.sendMessage(this.tgCtx.chatId, text, {
                link_preview_options: {
                    is_disabled: options?.dont_parse_links !== false,
                },
                reply_parameters: {
                    message_id: replyTo,
                },
                reply_markup: keyboard,
            });
        } catch (e) {
            global.logger.error(e);
            return undefined;
        }
    }

    async remove() {
        if (!this.messagePayload) {
            return undefined;
        }
        try {
            await this.tgCtx.deleteMessage();
        } catch (e) {
            global.logger.error(e);
            return undefined;
        }
    }

    async edit(text: string, options?: SendOptions): Promise<void> {
        if (!this.messagePayload) {
            return;
        }

        const keyboard = await this.createKeyboard(options?.keyboard);
        const hasMedia = options?.photo || options?.video || this.tgCtx.message?.photo || this.tgCtx.message?.video;
        if (hasMedia) {
            if (options?.photo) {
                await this.tgCtx.editMessageMedia(InputMediaBuilder.photo(options.photo), {
                    reply_markup: keyboard,
                });
            } else if (options?.video) {
                // TODO: support both
                const video = InputMediaBuilder.video(new InputFile(new URL(options.video.url)), {
                    width: options.video.width,
                    height: options.video.height,
                    duration: options.video.duration,
                    supports_streaming: true,
                    caption: text,
                });
                await this.tgCtx.editMessageMedia(video, {
                    reply_markup: keyboard,
                });
            }
            await this.tgCtx.editMessageCaption({
                reply_markup: keyboard,
                caption: text,
            });
        } else if (text != this.text) {
            await this.tgCtx.editMessageText(text, {
                link_preview_options: {
                    is_disabled: options?.dont_parse_links !== false,
                },
                reply_markup: keyboard,
            });
        } else if (options?.keyboard) {
            await this.tgCtx.editMessageReplyMarkup({
                reply_markup: keyboard,
            });
        }
    }

    async editMarkup(keyboard: IKeyboard) {
        if (!this.messagePayload) {
            return undefined;
        }
        const kb = await this.createKeyboard(keyboard);
        if (!kb) {
            return undefined;
        }
        return await this.tgCtx.editMessageReplyMarkup({
            reply_markup: kb,
        });
    }

    async answer(text: string): Promise<true> {
        if (!this.messagePayload) {
            return;
        }
        return await this.tgCtx.answerCallbackQuery(text);
    }

    async isUserAdmin(userId: number): Promise<boolean> {
        try {
            const res = await this.tgCtx.api.getChatMember(this.chatId, userId);
            return res.status == "creator" || res.status == "administrator";
        } catch (e) {
            if (e.message.includes("CHAT_ADMIN_REQUIRED")) {
                return false;
            }

            throw e;
        }
    }

    async isSenderAdmin(): Promise<boolean> {
        return this.isUserAdmin(this.senderId);
    }

    async isBotAdmin(): Promise<boolean> {
        return this.isUserAdmin(this.me.id);
    }

    async isUserInChat(userId: number, chatId?: number): Promise<boolean> {
        try {
            if (chatId) {
                const isValid = await this.isChatValid(chatId);
                if (!isValid) {
                    return false;
                }
            }

            const user = await this.tgCtx.api.getChatMember(chatId ?? this.chatId, userId);
            return user && user.status != "kicked" && user.status != "left";
        } catch (e) {
            return !e.description?.includes("member not found");
        }
    }

    async isChatValid(chatId: number): Promise<boolean> {
        try {
            const chatInfo = await this.tgCtx.api.getChat(chatId);
            return !!chatInfo;
        } catch (e) {
            return !e.description?.includes("chat not found");
        }
    }

    async isBotInChat(chatId: number): Promise<boolean> {
        return this.isUserInChat(this.me.id, chatId);
    }

    chatMembersCount(): Promise<number> {
        return this.tgCtx.api.getChatMemberCount(this.chatId);
    }

    hasLinks(): boolean {
        return this.tgCtx.message?.entities?.some((entity) => entity.type === "text_link");
    }

    getLinks(): Array<TextLinkMessageEntity> {
        return this.tgCtx.message?.entities?.filter((entity) => entity.type === "text_link");
    }

    hasFile(): boolean {
        return !!this.tgCtx.message?.document;
    }

    getFileName(): string {
        return this.tgCtx.message?.document?.file_name;
    }

    getFileSize(): number {
        return this.tgCtx.message?.document?.file_size ?? Number.MAX_VALUE;
    }

    registerTempFile(filePath: string) {
        if (!this.registryToken) {
            this.registryToken = {};
        }
        registry.register(this.registryToken, filePath);
    }

    async downloadFile(): Promise<string> {
        if (this.tmpFile) {
            return this.tmpFile;
        }

        const file = await this.tgCtx.getFile();

        this.tmpFile = this.localServer ? file.getUrl() : await file.download();

        this.registerTempFile(this.tmpFile);
        return this.tmpFile;
    }

    removeFile(): void {
        if (!this.tmpFile) {
            return;
        }
        try {
            if (fs.existsSync(this.tmpFile)) {
                fs.rmSync(this.tmpFile);
            }
            if (this.registryToken) {
                registry.unregister(this.registryToken);
                this.registryToken = undefined;
            }
            this.tmpFile = undefined;
        } catch {
            global.logger.fatal(`Failed to remove file: ${this.tmpFile}`);
        }
    }
}

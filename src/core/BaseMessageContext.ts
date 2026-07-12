import fs from "node:fs/promises";
import { TranslateFunction, TranslationVariables } from "../ILocalisator";
import { IKeyboard } from "../Util";
import Util from "../Util";
import { ApplicationStorage, ControllableFeature } from "./ApplicationStorage";
import { ExternalId, MessageIdentity, Platform } from "./Identity";
import { IMessageContext, ReplyToMessage, SendOptions, TextLinkEntity } from "./MessageContext";
import { ChatSettings, Language, UserSettings } from "./Settings";
import {
    ContentOutput,
    getContentOutputByPayloadCode,
    getContentOutputDefinition,
    getDefaultContentOutput,
    getSupportedContentOutputs,
    isContentOutputSupported,
} from "./ContentOutput";

export type MessageContextStorage = Pick<
    ApplicationStorage,
    "identities" | "userDirectory" | "featureFlags" | "userSettings" | "chatSettings"
>;

export interface BaseMessageContextOptions {
    platform: Platform;
    externalChatId: ExternalId;
    externalSenderId: ExternalId;
    ownerId: ExternalId;
    plainText?: string;
    plainPayload?: string;
    replyMessage?: ReplyToMessage;
    isInGroupChat: boolean;
    defaultLanguage?: Language;
}

const registry = new FinalizationRegistry(async (filePath: string) => {
    if (!(await Util.fileExists(filePath))) {
        return;
    }
    global.logger.warn(`Removing file ${filePath} after destructing message context`);
    try {
        await fs.rm(filePath);
    } catch {
        global.logger.fatal(`Failed to remove file: ${filePath}`);
    }
});

export abstract class BaseMessageContext implements IMessageContext {
    readonly platform: Platform;
    readonly externalChatId: ExternalId;
    readonly externalSenderId: ExternalId;
    readonly plainText?: string;
    readonly plainPayload?: string;
    readonly replyMessage?: ReplyToMessage;
    readonly isInGroupChat: boolean;

    userId: number;
    chatId: number;
    senderId: number;

    private readonly ownerId: ExternalId;
    private overriddenText?: string;
    private overriddenPayload?: string;
    private contentOutputOverride?: ContentOutput;
    private userSettingsCache?: UserSettings;
    private chatSettingsCache?: ChatSettings;
    private localisatorActivated = false;
    private language?: Language;
    private payloadLanguage?: Language;
    private readonly defaultLanguage?: Language;
    private internalTranslate?: TranslateFunction;
    private registryToken?: object;
    protected tmpFile?: string;

    protected constructor(
        options: BaseMessageContextOptions,
        protected readonly storage: MessageContextStorage
    ) {
        this.platform = options.platform;
        this.externalChatId = options.externalChatId;
        this.externalSenderId = options.externalSenderId;
        this.ownerId = options.ownerId;
        this.plainText = options.plainText;
        this.plainPayload = options.plainPayload;
        this.replyMessage = options.replyMessage;
        this.isInGroupChat = options.isInGroupChat;
        this.defaultLanguage = options.defaultLanguage;
        this.parsePayload();
    }

    get isFromOwner(): boolean {
        return String(this.externalSenderId) === String(this.ownerId);
    }

    get text(): string | undefined {
        return this.overriddenText ?? this.plainText;
    }

    get messagePayload(): string | undefined {
        return this.overriddenPayload ?? this.plainPayload;
    }

    tr(key: string, variables?: TranslationVariables): string {
        if (this.localisatorActivated && this.internalTranslate) {
            return this.internalTranslate(key, variables);
        }
        return `Error: Translation context is not activated. Please, report this to developer. Translation key: '${key}'.`;
    }

    bindIdentity(identity: MessageIdentity): void {
        this.userId = identity.user.userId;
        this.senderId = identity.user.accountId;
        this.chatId = identity.chat.chatId;
        if (this.replyMessage) {
            this.replyMessage.chatId = identity.chat.chatId;
            this.replyMessage.senderId = identity.replyUser?.accountId;
            this.replyMessage.userId = identity.replyUser?.userId;
        }
    }

    applyTextOverrides(aliases: Record<string, string>): void {
        const text = this.text;
        if (!text) {
            return;
        }

        const lowerText = text.toLowerCase();
        for (const [alias, command] of Object.entries(aliases)) {
            const lowerAlias = alias.toLowerCase();
            if (lowerText.startsWith(lowerAlias)) {
                if (text.length === alias.length || /^\s$/.test(text.charAt(alias.length))) {
                    this.overriddenText = (command + " " + text.slice(alias.length).trim()).trim();
                    return;
                }
            }
        }
    }

    async activateLocalisator(): Promise<void> {
        if (this.localisatorActivated) {
            return;
        }

        await this.selectLanguage();
        this.internalTranslate = await this.createTranslate(this.language);
        this.localisatorActivated = true;
    }

    async reactivateLocalisator(): Promise<void> {
        this.localisatorActivated = false;
        this.language = undefined;
        this.internalTranslate = undefined;
        await this.activateLocalisator();
    }

    async checkFeature(feature: ControllableFeature): Promise<boolean> {
        if (this.isFromOwner && (await this.storage.featureFlags.isFeatureEnabled("admin-all-features"))) {
            return true;
        }
        return await this.storage.featureFlags.isFeatureEnabled(feature);
    }

    async availableContentOutputs(): Promise<ContentOutput[]> {
        const available: ContentOutput[] = [];
        for (const output of getSupportedContentOutputs(this.platform)) {
            const requiredFeature = getContentOutputDefinition(output).requiredFeature;
            if (!requiredFeature || (await this.checkFeature(requiredFeature))) {
                available.push(output);
            }
        }

        return available;
    }

    async preferredContentOutput(): Promise<ContentOutput> {
        const available = await this.availableContentOutputs();
        if (available.length === 1) {
            return available[0];
        }

        const configured = this.contentOutputOverride ?? (await this.userSettings())?.content_output;
        if (available.includes(configured)) {
            return configured;
        }

        const platformDefault = getDefaultContentOutput(this.platform);
        return available.includes(platformDefault) ? platformDefault : (available[0] ?? platformDefault);
    }

    async preferCardsOutput(): Promise<boolean> {
        return (await this.preferredContentOutput()) === "oki-cards";
    }

    async userSettings(forceUpdate: boolean = false): Promise<UserSettings> {
        if (forceUpdate || !this.userSettingsCache) {
            this.userSettingsCache = await this.storage.userSettings.getUserSettings(this.userId, this.senderId);
        }
        return this.userSettingsCache;
    }

    async chatSettings(forceUpdate: boolean = false): Promise<ChatSettings> {
        if (!this.isInGroupChat) {
            return undefined;
        }
        if (forceUpdate || !this.chatSettingsCache) {
            this.chatSettingsCache = await this.storage.chatSettings.getChatSettings(this.chatId);
        }
        return this.chatSettingsCache;
    }

    async updateUserSettings(settings: UserSettings): Promise<void> {
        if (settings.user_id !== this.userId || settings.account_id !== this.senderId) {
            return;
        }
        await this.storage.userSettings.updateSettings(settings);
        this.userSettingsCache = settings;
    }

    async updateChatSettings(settings: ChatSettings): Promise<void> {
        if (!this.isInGroupChat || settings.chat_id !== this.chatId) {
            return;
        }
        await this.storage.chatSettings.updateSettings(settings);
        this.chatSettingsCache = settings;
    }

    registerTempFile(filePath: string): void {
        if (!this.registryToken) {
            this.registryToken = {};
        }
        registry.register(this.registryToken, filePath, this.registryToken);
    }

    async removeFile(): Promise<void> {
        if (!this.tmpFile) {
            return;
        }
        try {
            if (await Util.fileExists(this.tmpFile)) {
                await fs.rm(this.tmpFile);
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

    protected abstract createTranslate(language?: Language): Promise<TranslateFunction>;
    abstract ensureUserInfoUpdated(): Promise<void>;
    abstract reply(text: string, options?: SendOptions): Promise<unknown>;
    abstract send(text: string, options?: SendOptions, replyTo?: number): Promise<unknown>;
    abstract remove(): Promise<unknown>;
    abstract edit(text: string, options?: SendOptions): Promise<void>;
    abstract editMarkup(keyboard: IKeyboard): Promise<unknown>;
    abstract answer(text: string): Promise<true | void>;
    abstract isUserAdmin(accountId: number): Promise<boolean>;
    abstract isSenderAdmin(): Promise<boolean>;
    abstract isBotAdmin(): Promise<boolean>;
    abstract isUserInChat(accountId: number, chatId?: number): Promise<boolean>;
    abstract isChatValid(chatId: number): Promise<boolean>;
    abstract isBotInChat(chatId: number): Promise<boolean>;
    abstract mentionUser(accountId: number): Promise<string>;
    abstract chatMembersCount(): Promise<number>;
    abstract hasLinks(): boolean;
    abstract getLinks(): TextLinkEntity[];
    abstract hasFile(): boolean;
    abstract getFileName(): string;
    abstract getFileSize(): number;
    abstract downloadFile(): Promise<string>;

    protected async prepareButtonPayload(command: string): Promise<string> {
        await this.selectLanguage();
        const contentOutput = await this.preferredContentOutput();
        const outputCode = getContentOutputDefinition(contentOutput).payloadCode;
        const language = this.language ?? "en";
        return `^${outputCode}^l${language}^${command}`;
    }

    protected async getExternalUserId(accountId: number): Promise<number | undefined> {
        const identity = await this.storage.identities.getUser(accountId);
        if (!identity) {
            return undefined;
        }
        const id = Number(identity.externalId);
        return Number.isSafeInteger(id) ? id : undefined;
    }

    protected async getExternalChatId(chatId: number): Promise<number | string | undefined> {
        if (chatId === this.chatId) {
            return this.externalChatId;
        }
        const identity = await this.storage.identities.getChat(chatId);
        return identity?.externalId;
    }

    private parsePayload(): void {
        if (!this.plainPayload?.startsWith("^")) {
            return;
        }

        const payloadParts = this.plainPayload.slice(1).split("^");
        if (payloadParts.length < 2) {
            this.overriddenPayload = payloadParts[0];
            return;
        }

        const payload: string[] = [];
        let argsEnded = false;
        for (const part of payloadParts) {
            if (!argsEnded) {
                const contentOutput = getContentOutputByPayloadCode(part);
                if (contentOutput && isContentOutputSupported(this.platform, contentOutput)) {
                    this.contentOutputOverride = contentOutput;
                } else if (part === "lru" || part === "len" || part === "lzh") {
                    this.payloadLanguage = part.slice(1) as Language;
                } else {
                    argsEnded = true;
                }
            }
            if (argsEnded) {
                payload.push(part);
            }
        }
        this.overriddenPayload = payload.join("^");
    }

    private async selectLanguage(): Promise<void> {
        if (this.language) {
            return;
        }
        if (this.isInGroupChat) {
            const chatSettings = await this.chatSettings();
            if (chatSettings?.language_override !== "do_not_override") {
                this.language = chatSettings?.language_override;
            }
        }
        if (!this.language) {
            const userSettings = await this.userSettings();
            if (userSettings?.language_override !== "do_not_override") {
                this.language = userSettings?.language_override;
            }
        }
        this.language ??= this.payloadLanguage ?? this.defaultLanguage;
    }
}

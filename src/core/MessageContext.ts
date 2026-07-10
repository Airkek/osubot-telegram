import { ILocalisator } from "../ILocalisator";
import { ControllableFeature } from "./ApplicationStorage";
import { ChatSettings, UserSettings } from "./Settings";
import { IKeyboard } from "../Util";

export interface ReplyToMessage {
    readonly text: string;
    readonly senderId: number;
    readonly chatId: number;
}

export interface TextLinkEntity {
    readonly type: "text_link";
    readonly offset: number;
    readonly length: number;
    readonly url: string;
}

export interface VideoMeta {
    url: string;
    width: number;
    height: number;
    duration: number;
}

export type MediaFile = string | Buffer;

export interface SendOptions {
    keyboard?: IKeyboard;
    photo?: MediaFile;
    video?: VideoMeta;
    dont_parse_links?: boolean;
}

export class MessageNotModifiedError extends Error {
    constructor() {
        super("Message is not modified");
        this.name = "MessageNotModifiedError";
    }
}

export interface IMessageContext extends ILocalisator {
    readonly chatId: number;
    readonly senderId: number;
    readonly plainText?: string;
    readonly plainPayload?: string;
    readonly replyMessage?: ReplyToMessage;
    readonly isInGroupChat: boolean;
    readonly isFromOwner: boolean;
    readonly text?: string;
    readonly messagePayload?: string;

    applyTextOverrides(aliases: Record<string, string>): void;
    ensureUserInfoUpdated(): Promise<void>;
    activateLocalisator(): Promise<void>;
    reactivateLocalisator(): Promise<void>;
    checkFeature(feature: ControllableFeature): Promise<boolean>;
    preferCardsOutput(): Promise<boolean>;
    userSettings(forceUpdate?: boolean): Promise<UserSettings>;
    chatSettings(forceUpdate?: boolean): Promise<ChatSettings>;
    updateUserSettings(settings: UserSettings): Promise<void>;
    updateChatSettings(settings: ChatSettings): Promise<void>;
    reply(text: string, options?: SendOptions): Promise<unknown>;
    send(text: string, options?: SendOptions, replyTo?: number): Promise<unknown>;
    remove(): Promise<unknown>;
    edit(text: string, options?: SendOptions): Promise<void>;
    editMarkup(keyboard: IKeyboard): Promise<unknown>;
    answer(text: string): Promise<true | void>;
    isUserAdmin(userId: number): Promise<boolean>;
    isSenderAdmin(): Promise<boolean>;
    isBotAdmin(): Promise<boolean>;
    isUserInChat(userId: number, chatId?: number): Promise<boolean>;
    isChatValid(chatId: number): Promise<boolean>;
    isBotInChat(chatId: number): Promise<boolean>;
    mentionUser(userId: number): Promise<string>;
    chatMembersCount(): Promise<number>;
    hasLinks(): boolean;
    getLinks(): TextLinkEntity[];
    hasFile(): boolean;
    getFileName(): string;
    getFileSize(): number;
    registerTempFile(filePath: string): void;
    downloadFile(): Promise<string>;
    removeFile(): Promise<void>;
}

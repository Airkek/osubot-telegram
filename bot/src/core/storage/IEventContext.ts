import { Platform } from "core/Platform";

export interface IEventContext {
    platform: Platform;
    senderId: number;
    chatId: number;
    plainPayload?: string;
    plainText?: string;
}

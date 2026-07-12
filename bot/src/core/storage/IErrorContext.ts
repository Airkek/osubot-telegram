import { Platform } from "core/Platform";

export interface IErrorContext {
    platform: Platform;
    senderId: number;
    plainPayload?: string;
    plainText?: string;
    replyMessage?: { senderId?: number };
}

import { ExternalId } from "core/ExternalId";

export interface IReplyMessage {
    text: string;
    externalSenderId: ExternalId;
    externalChatId: ExternalId;
    senderId?: number;
    userId?: number;
    chatId?: number;
}

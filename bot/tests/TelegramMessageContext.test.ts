import { expect, test } from "@jest/globals";
import { TelegramMessageContext } from "../src/platforms/telegram/TelegramMessageContext";

function createContext(
    message?: object,
    callbackMessage?: object,
    chatType: "group" | "supergroup" = "supergroup"
): TelegramMessageContext {
    return new TelegramMessageContext(
        {
            chatId: -100123,
            chat: { id: -100123, type: chatType },
            from: { id: 5, is_bot: false, first_name: "Test" },
            message,
            callbackQuery: callbackMessage ? { message: callbackMessage } : undefined,
        } as never,
        1,
        { id: 1 } as never,
        false,
        {} as never,
        {} as never
    );
}

test("Telegram messages marked as topic messages without a thread ID use General topic ID 1", () => {
    expect(createContext({ is_topic_message: true }).topicId).toBe(1);
});

test("Telegram callback messages marked as topic messages without a thread ID use General topic ID 1", () => {
    expect(createContext(undefined, { is_topic_message: true }).topicId).toBe(1);
});

test("Telegram topic IDs are preserved and non-topic messages stay unidentified", () => {
    expect(createContext({ is_topic_message: true, message_thread_id: 44 }).topicId).toBe(44);
    expect(createContext({}).topicId).toBeUndefined();
    expect(createContext({ is_topic_message: true }, undefined, "group").topicId).toBeUndefined();
});

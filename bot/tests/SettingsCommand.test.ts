import { expect, jest, test } from "@jest/globals";
import { Module } from "../src/commands/Module";
import { SettingsCommand } from "../src/commands/modules/main/SettingsCommand";
import { runtimePaths } from "../src/application/RuntimePaths";
import { IMessageContext } from "../src/core/IMessageContext";
import { IUserSettings } from "../src/core/IUserSettings";
import { FluentLocalizer } from "../src/localization/FluentLocalizer";
import { TelegramMessageContext } from "../src/platforms/telegram/TelegramMessageContext";
import { IKeyboard } from "../src/presentation/keyboard/IKeyboard";
import { validateKeyboard } from "../src/presentation/keyboard/makeKeyboard";
import { createTestStorage } from "./fakes/ApplicationStorageFake";

global.logger = {
    error() {},
    trace() {},
} as typeof global.logger;

const settings: IUserSettings = {
    user_id: 37666,
    account_id: 37666,
    platform: "telegram",
    render_enabled: true,
    notifications_enabled: true,
    enable_find: true,
    language_override: "ru",
    content_output: "legacy-text",
    ordr_skin: "whitecatCK1.0",
    ordr_video: true,
    ordr_storyboard: true,
    ordr_bgdim: 75,
    ordr_pp_counter: true,
    ordr_ur_counter: true,
    ordr_hit_counter: true,
    ordr_strain_graph: true,
    ordr_is_skin_custom: false,
    ordr_master_volume: 100,
    ordr_music_volume: 100,
    ordr_effects_volume: 100,
    experimental_renderer: true,
    experimental_scroll_speed: 26,
};

function createSettingsCommand(storage = createTestStorage()): SettingsCommand {
    const module = new Module(["osu"], {
        storage,
        addCallback: jest.fn(),
    } as never);
    module.name = "Main";
    return new SettingsCommand(module);
}

function createContext(page: "render" | "render_advanced"): {
    context: IMessageContext;
    editMarkup: ReturnType<typeof jest.fn>;
    reply: ReturnType<typeof jest.fn>;
    getKeyboard: () => IKeyboard;
} {
    let keyboard: IKeyboard;
    const editMarkup = jest.fn(async (value: IKeyboard) => {
        keyboard = value;
    });
    const reply = jest.fn(async () => undefined);
    const context = {
        platform: "telegram",
        externalSenderId: 37666,
        externalChatId: 37666,
        senderId: 37666,
        userId: 37666,
        chatId: 37666,
        isInGroupChat: false,
        text: `osu s 37666:page:${page}`,
        messagePayload: `osu s 37666:page:${page}`,
        activateLocalizer: async () => {},
        userSettings: async () => ({ ...settings }),
        editMarkup,
        reply,
        tr: (key: string) => key,
    } as unknown as IMessageContext;
    return {
        context,
        editMarkup,
        reply,
        getKeyboard: () => keyboard,
    };
}

test("experimental render settings fit the keyboard and link to the advanced page", async () => {
    const command = createSettingsCommand();
    const { context, editMarkup, reply, getKeyboard } = createContext("render");

    await command.function(context, command, { fullString: "37666:page:render" } as never);

    expect(reply).not.toHaveBeenCalled();
    expect(editMarkup).toHaveBeenCalledTimes(1);
    const keyboard = getKeyboard();
    expect(() => validateKeyboard(keyboard)).not.toThrow();
    expect(keyboard.flat().map((button) => button.command)).toContain("osu s 37666:page:radv");
});

test("experimental advanced render settings contain scroll speed and return navigation", async () => {
    const command = createSettingsCommand();
    const { context, editMarkup, reply, getKeyboard } = createContext("render_advanced");

    await command.function(context, command, { fullString: "37666:page:render_advanced" } as never);

    expect(reply).not.toHaveBeenCalled();
    expect(editMarkup).toHaveBeenCalledTimes(1);
    const keyboard = getKeyboard();
    expect(() => validateKeyboard(keyboard)).not.toThrow();
    const commands = keyboard.flat().map((button) => button.command);
    expect(commands).toContain("osu s 37666:set:radv:scrl");
    expect(commands).toContain("osu s 37666:page:rend");
});

test("Telegram advanced render settings keep callback data within the platform limit", async () => {
    const callbackData: string[] = [];
    const editMessageReplyMarkup = jest.fn(
        async (params: { reply_markup: { inline_keyboard: { callback_data?: string }[][] } }) => {
            callbackData.push(
                ...params.reply_markup.inline_keyboard
                    .flat()
                    .map((button) => button.callback_data)
                    .filter((data): data is string => data !== undefined)
            );
        }
    );
    const storage = createTestStorage({
        userSettings: {
            getUserSettings: async () => ({ ...settings }),
            updateSettings: async () => {},
        },
    });
    const context = new TelegramMessageContext(
        {
            chatId: 37666,
            chat: { id: 37666, type: "private" },
            from: { id: 37666, is_bot: false, first_name: "Test", language_code: "ru" },
            callbackQuery: { data: "^g2^lru^osu s 37666:page:render_advanced" },
            editMessageReplyMarkup,
        } as never,
        1,
        { id: 1 } as never,
        false,
        storage,
        new FluentLocalizer(runtimePaths.locales)
    );
    context.bindIdentity({
        user: {
            accountId: 37666,
            userId: 37666,
            platform: "telegram",
            externalId: "37666",
        },
        chat: {
            chatId: 37666,
            platform: "telegram",
            externalId: "37666",
        },
    });
    await context.activateLocalizer();
    const command = createSettingsCommand(storage);

    await command.function(context, command, { fullString: "37666:page:render_advanced" } as never);

    expect(editMessageReplyMarkup).toHaveBeenCalledTimes(1);
    expect(callbackData.length).toBeGreaterThan(0);
    expect(callbackData.every((data) => Buffer.byteLength(data, "utf8") <= 64)).toBe(true);
    expect(callbackData.some((data) => data.endsWith(":set:radv:scrl"))).toBe(true);
});

test("Telegram scroll speed input keeps its cancel callback within the platform limit", async () => {
    const accountId = 2_147_483_647;
    const callbackData: string[] = [];
    const editMessageText = jest.fn(
        async (_text: string, params: { reply_markup?: { inline_keyboard: { callback_data?: string }[][] } }) => {
            callbackData.push(
                ...(params.reply_markup?.inline_keyboard ?? [])
                    .flat()
                    .map((button) => button.callback_data)
                    .filter((data): data is string => data !== undefined)
            );
        }
    );
    const storage = createTestStorage({
        userSettings: {
            getUserSettings: async () => ({
                ...settings,
                user_id: accountId,
                account_id: accountId,
            }),
            updateSettings: async () => {},
        },
    });
    const context = new TelegramMessageContext(
        {
            chatId: accountId,
            chat: { id: accountId, type: "private" },
            from: { id: accountId, is_bot: false, first_name: "Test", language_code: "ru" },
            callbackQuery: { data: `^g2^lru^osu s ${accountId}:set:radv:scrl` },
            editMessageText,
        } as never,
        1,
        { id: 1 } as never,
        false,
        storage,
        new FluentLocalizer(runtimePaths.locales)
    );
    context.bindIdentity({
        user: {
            accountId,
            userId: accountId,
            platform: "telegram",
            externalId: String(accountId),
        },
        chat: {
            chatId: accountId,
            platform: "telegram",
            externalId: String(accountId),
        },
    });
    await context.activateLocalizer();
    const module = new Module(["osu"], {
        storage,
        addCallback: () => `telegram:${accountId}_-100${accountId}`,
    } as never);
    const command = new SettingsCommand(module);

    await command.function(context, command, {
        fullString: `${accountId}:set:radv:scrl`,
    } as never);

    expect(editMessageText).toHaveBeenCalledTimes(1);
    expect(callbackData.every((data) => Buffer.byteLength(data, "utf8") <= 64)).toBe(true);
    expect(callbackData.some((data) => data.endsWith(":cncl:radv"))).toBe(true);
});

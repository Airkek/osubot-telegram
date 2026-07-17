import { expect, jest, test } from "@jest/globals";
import { MessageContext as VKIOMessageContext, UpdateSource } from "vk-io";
import sharp from "sharp";
import { runtimePaths } from "../src/application/RuntimePaths";
import { FluentLocalizer } from "../src/localization/FluentLocalizer";
import { VideoSendFailedError } from "../src/core/errors/VideoSendFailedError";
import { VKMessageContext } from "../src/platforms/vk/VKMessageContext";
import { VKBotAdapter } from "../src/platforms/vk/VKBotAdapter";
import { Module } from "../src/commands/Module";
import { OnboardingCommand } from "../src/commands/modules/main/OnboardingCommand";
import { uploadMessagePhoto } from "../src/platforms/vk/Upload";
import { createTestStorage } from "./fakes/ApplicationStorageFake";

global.logger = {
    error() {},
    info() {},
    warn() {},
    trace() {},
} as typeof global.logger;

test("VK callback payload uses the shared command and graphical-mode envelope", async () => {
    let sent: Record<string, unknown>;
    const event = {
        type: "message_event",
        userId: 10,
        peerId: 20,
        eventPayload: { command: "^g2^s u" },
        send: async (params: Record<string, unknown>) => {
            sent = params;
            return params;
        },
    };
    const storage = createTestStorage({ platform: "vk" });
    const context = new VKMessageContext(
        event as never,
        {} as never,
        30,
        40,
        storage,
        new FluentLocalizer(runtimePaths.locales)
    );

    expect(context.messagePayload).toBe("s u");
    await context.send("hello", {
        keyboard: [[{ text: "User", command: "s u" }]],
    });

    const keyboard = JSON.parse(String(sent.keyboard));
    const payload = JSON.parse(keyboard.buttons[0][0].action.payload);
    expect(payload.command).toBe("^g1^len^s u");
});

function createStartMessage(): VKIOMessageContext {
    return new VKIOMessageContext({
        api: {},
        upload: {},
        source: UpdateSource.WEBHOOK,
        groupId: 30,
        updateType: "message_new",
        state: {},
        payload: {
            client_info: { lang_id: 0 },
            message: {
                id: 1,
                conversation_message_id: 1,
                sender_id: 10,
                peer_id: 10,
                from_id: 10,
                text: "Начать",
                date: 1,
                attachments: [],
                out: 0,
                payload: JSON.stringify({ command: "start" }),
            },
        },
    } as never);
}

test("VK message context only parses the start payload", () => {
    const context = new VKMessageContext(
        createStartMessage(),
        {} as never,
        30,
        40,
        createTestStorage({ platform: "vk" }),
        new FluentLocalizer(runtimePaths.locales)
    );

    expect(context.messagePayload).toBe("start");
    expect(context.text).toBe("Начать");
});

test("VK adapter routes the start payload to the onboarding greeting", async () => {
    const storage = createTestStorage({ platform: "vk" });
    const adapter = new VKBotAdapter({ token: "test", owner: 40 }, new FluentLocalizer(runtimePaths.locales));
    Reflect.set(adapter, "runtime", { storage });
    Reflect.set(adapter, "groupId", 30);

    const buildContext = Reflect.get(adapter, "buildContext");
    if (typeof buildContext !== "function") {
        throw new Error("VK adapter context builder is not available");
    }
    const context = Reflect.apply(buildContext, adapter, [createStartMessage()]);
    if (!(context instanceof VKMessageContext)) {
        throw new Error("VK adapter returned an invalid message context");
    }
    const [user, chat] = await Promise.all([
        storage.identities.resolveUser(context.externalSenderId),
        storage.identities.resolveChat(context.externalChatId),
    ]);
    context.bindIdentity({ user, chat });

    const reply = jest.spyOn(context, "reply").mockResolvedValue(undefined);
    const edit = jest.spyOn(context, "edit").mockResolvedValue(undefined);
    const module = new Module(["osu"], { storage } as never);
    module.name = "Main";
    const onboarding = new OnboardingCommand(module);
    module.registerCommand(onboarding);
    const match = module.checkContext(context);
    if (!match) {
        throw new Error("VK start payload did not resolve to onboarding");
    }

    await match.command.process(context);

    expect(context.messagePayload).toBeUndefined();
    expect(context.text).toBe("osu onboarding");
    expect(reply).toHaveBeenCalledWith(
        expect.stringContaining(context.tr("onboarding-text-greeting")),
        expect.objectContaining({ keyboard: expect.any(Array) })
    );
    expect(edit).not.toHaveBeenCalled();
});

test("VK treats the first forwarded message as a reply fallback", () => {
    const storage = createTestStorage({ platform: "vk" });
    const createContext = (reply: unknown, forwards: unknown[]) =>
        new VKMessageContext(
            {
                type: "message",
                id: 1,
                senderId: 10,
                peerId: 20,
                text: "s u",
                replyMessage: reply,
                forwards,
            } as never,
            {} as never,
            30,
            40,
            storage,
            new FluentLocalizer(runtimePaths.locales)
        );
    const forwarded = { text: "forwarded", senderId: 11, peerId: 0 };

    expect(createContext(undefined, [forwarded]).replyMessage).toEqual({
        text: "forwarded",
        externalSenderId: 11,
        externalChatId: 20,
    });
    expect(createContext({ text: "reply", senderId: 12, peerId: 20 }, [forwarded]).replyMessage).toEqual({
        text: "reply",
        externalSenderId: 12,
        externalChatId: 20,
    });
});

test("VK retries buffered photo uploads through the community client for the destination peer", async () => {
    const timeout = new Error("upload timeout");
    timeout.name = "AbortError";
    const communityMessagePhoto = jest
        .fn(async (params: Record<string, unknown>) => {
            void params;
            return { toString: () => "photo-1_2" };
        })
        .mockRejectedValueOnce(timeout)
        .mockRejectedValueOnce(timeout);
    const userMessagePhoto = jest.fn();
    let sent: Record<string, unknown>;
    const message = {
        type: "message",
        id: 1,
        senderId: 10,
        peerId: 10,
        text: "s t user",
        send: async (params: Record<string, unknown>) => {
            sent = params;
            return params;
        },
    };
    const context = new VKMessageContext(
        message as never,
        { upload: { messagePhoto: communityMessagePhoto } } as never,
        30,
        40,
        createTestStorage({ platform: "vk" }),
        new FluentLocalizer(runtimePaths.locales),
        { upload: { messagePhoto: userMessagePhoto } } as never
    );

    const image = await sharp({
        create: {
            width: 1,
            height: 1,
            channels: 4,
            background: { r: 255, g: 0, b: 0, alpha: 1 },
        },
    })
        .png()
        .toBuffer();
    await context.send("", { photo: image });

    expect(userMessagePhoto).not.toHaveBeenCalled();
    expect(communityMessagePhoto).toHaveBeenCalledTimes(3);
    expect(communityMessagePhoto).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
            peer_id: 10,
            source: expect.objectContaining({
                values: expect.objectContaining({
                    filename: "image.png",
                    contentType: "image/png",
                    contentLength: image.length,
                }),
            }),
        })
    );
    expect(sent.attachment).toBe("photo-1_2");
});

test("VK cover upload can fail fast without retrying", async () => {
    const timeout = new Error("upload timeout");
    timeout.name = "AbortError";
    const messagePhoto = jest.fn(async (params: Record<string, unknown>) => {
        void params;
        throw timeout;
    });
    const image = await sharp({
        create: {
            width: 1,
            height: 1,
            channels: 3,
            background: { r: 255, g: 0, b: 0 },
        },
    })
        .jpeg()
        .toBuffer();

    await expect(
        uploadMessagePhoto({ upload: { messagePhoto } } as never, 10, image, {
            retry: false,
            maxTimeoutMs: 10_000,
        })
    ).rejects.toBe(timeout);
    expect(messagePhoto).toHaveBeenCalledTimes(1);
});

test("VK uploads video through the user client", async () => {
    const messageDocument = jest.fn();
    const video = jest.fn(async (params: Record<string, unknown>) => {
        void params;
        return {
            toString: () => "video-1_2",
        };
    });
    const send = jest.fn(async (params: Record<string, unknown>) => params);
    const message = {
        type: "message",
        id: 1,
        senderId: 10,
        peerId: 10,
        text: "render",
        send,
    };
    const context = new VKMessageContext(
        message as never,
        { upload: { messageDocument } } as never,
        30,
        40,
        createTestStorage({ platform: "vk" }),
        new FluentLocalizer(runtimePaths.locales),
        { upload: { video } } as never
    );

    const internalUrl = "http://experimental-render:9732/export/video";
    await context.send("done", {
        video: {
            url: internalUrl,
            title: "match export",
            width: 1920,
            height: 1080,
            duration: 30,
        },
    });

    expect(video).toHaveBeenCalledWith(
        expect.objectContaining({
            group_id: 30,
            name: "match export",
            is_private: 1,
            wallpost: 0,
            no_comments: 1,
            source: expect.objectContaining({
                values: expect.objectContaining({
                    value: internalUrl,
                    filename: "video.mp4",
                    contentType: "video/mp4",
                }),
                timeout: 300_000,
            }),
        })
    );
    expect(messageDocument).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ message: "done", attachment: "video-1_2" }));
});

test("VK rejects video sending when the user client is unavailable", async () => {
    const send = jest.fn();
    const context = new VKMessageContext(
        {
            type: "message",
            id: 1,
            senderId: 10,
            peerId: 10,
            text: "render",
            send,
        } as never,
        {} as never,
        30,
        40,
        createTestStorage({ platform: "vk" }),
        new FluentLocalizer(runtimePaths.locales)
    );

    const result = context.send("done", {
        video: {
            url: "http://experimental-render:9732/export/video",
            width: 1920,
            height: 1080,
            duration: 30,
        },
    });
    await expect(result).rejects.toBeInstanceOf(VideoSendFailedError);
    await expect(result).rejects.toMatchObject({ translationKey: "video-send-failed" });
    expect(send).not.toHaveBeenCalled();
});

test("VK does not expose the internal video URL when upload fails", async () => {
    const internalUrl = "http://experimental-render:9732/export/video";
    const video = jest.fn(async () => {
        throw new Error("video upload failed");
    });
    const send = jest.fn();
    const context = new VKMessageContext(
        {
            type: "message",
            id: 1,
            senderId: 10,
            peerId: 10,
            text: "render",
            send,
        } as never,
        {} as never,
        30,
        40,
        createTestStorage({ platform: "vk" }),
        new FluentLocalizer(runtimePaths.locales),
        { upload: { video } } as never
    );

    const result = context.send("done", {
        video: {
            url: internalUrl,
            width: 1920,
            height: 1080,
            duration: 30,
        },
    });
    await expect(result).rejects.toBeInstanceOf(VideoSendFailedError);
    await expect(result).rejects.toMatchObject({ translationKey: "video-send-failed" });
    expect(send).not.toHaveBeenCalled();
});

test("VK markup edit preserves the current message content", async () => {
    const edit = jest.fn(async (params: Record<string, unknown>) => params);
    const getByConversationMessageId = jest.fn(async (params: Record<string, unknown>) => {
        void params;
        return {
            count: 1,
            items: [
                {
                    text: "Settings:",
                    attachments: [],
                },
            ],
        };
    });
    const event = {
        type: "message_event",
        userId: 10,
        peerId: 20,
        conversationMessageId: 30,
        eventPayload: { command: "osu s 10:page:language" },
        send: async () => {},
    };
    const context = new VKMessageContext(
        event as never,
        { api: { messages: { edit, getByConversationMessageId } } } as never,
        40,
        50,
        createTestStorage({ platform: "vk" }),
        new FluentLocalizer(runtimePaths.locales)
    );

    await context.editMarkup([[{ text: "English", command: "osu s 10:set:en" }]]);

    expect(getByConversationMessageId).toHaveBeenCalledWith({
        peer_id: 20,
        conversation_message_ids: 30,
        group_id: 40,
    });
    expect(edit).toHaveBeenCalledWith(expect.objectContaining({ message: "Settings:" }));
});

import { MessageContext, MessageEventContext, VK } from "vk-io";
import { ApplicationRuntime } from "application/ApplicationRuntime";
import { IBotIdentity } from "core/storage/IBotIdentity";
import { IMediaReferenceCache } from "core/storage/IMediaReferenceCache";
import { FluentLocalizer } from "localization/FluentLocalizer";
import { ExternalId } from "core/ExternalId";
import { IPlatformAdapter } from "core/IPlatformAdapter";
import { UpdateDispatcher } from "application/UpdateDispatcher";
import { VKMediaAttachmentProvider } from "platforms/vk/VKMediaAttachmentProvider";
import { VKMessageContext } from "platforms/vk/VKMessageContext";
import { VK_UPLOAD_TIMEOUT_MS, VK_VIDEO_UPLOAD_TIMEOUT_MS } from "platforms/vk/Upload";
import { IVKBotConfig } from "platforms/vk/IVKBotConfig";

const VK_UPDATE_CONCURRENCY = 40;
const VK_UPDATE_QUEUE_CAPACITY = 1000;
const RATE_LIMIT_WINDOW_MS = 5000;
const RATE_LIMIT_COMMANDS = 3;

type VKUpdate = { type: "message"; context: MessageContext } | { type: "callback"; context: MessageEventContext };

export class VKBotAdapter implements IPlatformAdapter {
    readonly platform = "vk" as const;
    readonly vk: VK;

    private readonly userVk?: VK;
    private readonly commandAttempts = new Map<string, number[]>();
    private runtime?: ApplicationRuntime;
    private dispatcher?: UpdateDispatcher<VKUpdate>;
    private groupId?: number;
    private configured = false;

    constructor(
        private readonly config: IVKBotConfig,
        private readonly localizer: FluentLocalizer
    ) {
        global.logger.info("Set VK owner id: ", config.owner);
        this.vk = new VK({ token: config.token, uploadTimeout: VK_UPLOAD_TIMEOUT_MS });
        if (config.userToken) {
            this.userVk = new VK({ token: config.userToken, uploadTimeout: VK_VIDEO_UPLOAD_TIMEOUT_MS });
        } else {
            global.logger.warn("VK_USER_TOKEN is not configured; VK video attachments are disabled");
        }
    }

    createMediaAttachmentProvider(mediaReferences: IMediaReferenceCache): VKMediaAttachmentProvider {
        return new VKMediaAttachmentProvider(mediaReferences, this.vk, this.config.owner);
    }

    async sendMessage(recipientId: ExternalId, text: string): Promise<void> {
        const peerId = Number(recipientId);
        if (!Number.isSafeInteger(peerId)) {
            throw new Error(`Invalid VK recipient id: ${recipientId}`);
        }
        await this.vk.api.messages.send({ peer_id: peerId, random_id: 0, message: text });
    }

    getPublicLink(identity: IBotIdentity): string {
        return `https://vk.com/${identity.username || `club${identity.id}`}`;
    }

    async start(runtime: ApplicationRuntime): Promise<IBotIdentity> {
        this.runtime = runtime;
        this.configureUpdates();

        const response = await this.vk.api.groups.getById({});
        const group = response.groups[0];
        if (!group) {
            throw new Error("VK token is not associated with a community");
        }
        this.groupId = group.id;

        if (this.userVk) {
            const profiles = await this.userVk.api.users.get({ fields: ["screen_name"] });
            const account = profiles[0];
            if (!account) {
                throw new Error("VK_USER_TOKEN is not associated with a user account");
            }
            const screenName = account.screen_name ? `@${account.screen_name}, ` : "";
            global.logger.info(
                `VK user token account: ${account.first_name} ${account.last_name} (${screenName}id: ${account.id})`
            );
        }

        await this.vk.updates.start();
        global.logger.info(`VK bot started as ${group.name} (club${group.id})`);
        return {
            id: group.id,
            username: group.screen_name,
            first_name: group.name,
        };
    }

    async stop(): Promise<void> {
        await this.vk.updates.stop();
        await this.dispatcher?.stop();
        global.logger.info("VK bot stopped");
    }

    private configureUpdates(): void {
        if (this.configured) {
            return;
        }
        this.configured = true;
        this.dispatcher = new UpdateDispatcher<VKUpdate>(
            (update) => this.handleUpdate(update),
            (error, update) => {
                global.logger.error(`Failed to handle VK ${update.type} update`, error);
            },
            VK_UPDATE_CONCURRENCY,
            VK_UPDATE_QUEUE_CAPACITY
        );

        this.vk.updates.on("message_new", (context) => {
            this.enqueue({ type: "message", context });
        });
        this.vk.updates.on("message_event", (context) => {
            this.enqueue({ type: "callback", context });
        });
    }

    private enqueue(update: VKUpdate): void {
        if (!this.dispatcher?.enqueue(update)) {
            global.logger.warn(`VK update queue is full; dropping ${update.type} update`);
        }
    }

    private async handleUpdate(update: VKUpdate): Promise<void> {
        if (!this.runtime) {
            throw new Error("VK adapter received an update before runtime initialization");
        }

        if (update.type === "callback") {
            const context = this.buildContext(update.context);
            if (this.isRateLimited(context, true)) {
                await this.runtime.handleRateLimit(context);
                return;
            }
            if (await this.runtime.handleCallbackQuery(context)) {
                await context.acknowledge();
            }
            return;
        }

        const message = update.context;
        if (message.isOutbox || message.isFromGroup) {
            return;
        }
        if (await this.handleMembershipEvent(message)) {
            return;
        }
        if (message.isEvent) {
            return;
        }

        const context = this.buildContext(message);
        const alias = this.commandAlias(message.text);
        if (this.isRateLimited(context, Boolean(alias))) {
            await this.runtime.handleRateLimit(context);
            return;
        }
        if (alias) {
            await this.runtime.handleCommandAlias(context, alias.source, alias.target);
        } else {
            await this.runtime.handleMessage(context);
        }
    }

    private async handleMembershipEvent(context: MessageContext): Promise<boolean> {
        if (!this.runtime) {
            return false;
        }
        const memberId = context.eventMemberId;
        if (memberId === undefined) {
            return false;
        }

        if (context.eventType === "chat_invite_user" || context.eventType === "chat_invite_user_by_link") {
            if (memberId > 0) {
                await this.runtime.userJoined(this.platform, memberId, context.peerId);
            }
            return true;
        }
        if (context.eventType === "chat_kick_user") {
            const isCurrentBot = memberId === -this.requireGroupId();
            await this.runtime.userLeft(this.platform, memberId, context.peerId, isCurrentBot);
            return true;
        }
        return false;
    }

    private buildContext(context: MessageContext | MessageEventContext): VKMessageContext {
        if (!this.runtime) {
            throw new Error("VK runtime is not initialized");
        }
        return new VKMessageContext(
            context,
            this.vk,
            this.requireGroupId(),
            this.config.owner,
            this.runtime.storage,
            this.localizer,
            this.userVk
        );
    }

    private commandAlias(text?: string): { source: string; target: string } | undefined {
        if (!text || !this.runtime) {
            return undefined;
        }
        const match = text.match(/^\/[a-z_]+(?:@[a-z0-9_]+)?/i);
        if (!match) {
            return undefined;
        }
        const command = match[0].slice(1).split("@")[0].toLowerCase();
        const target = this.runtime.commandAliases[command];
        return target ? { source: match[0], target } : undefined;
    }

    private isRateLimited(context: VKMessageContext, commandAlias: boolean): boolean {
        if (!this.runtime) {
            return false;
        }
        const runtimeKey = this.runtime.getRateLimitKey(context);
        const isCommand = commandAlias || runtimeKey.endsWith(":command");
        if (!isCommand) {
            return false;
        }

        const key = `vk:${context.externalSenderId}:command`;
        const now = Date.now();
        const attempts = (this.commandAttempts.get(key) ?? []).filter((time) => now - time < RATE_LIMIT_WINDOW_MS);
        if (attempts.length >= RATE_LIMIT_COMMANDS) {
            this.commandAttempts.set(key, attempts);
            return true;
        }
        attempts.push(now);
        this.commandAttempts.set(key, attempts);
        return false;
    }

    private requireGroupId(): number {
        if (!this.groupId) {
            throw new Error("VK group identity is not initialized");
        }
        return this.groupId;
    }
}

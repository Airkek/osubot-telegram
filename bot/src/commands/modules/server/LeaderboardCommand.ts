import { getLeaderboard } from "application/LeaderboardService";
import { CommandContext } from "commands/CommandContext";
import { ServerCommand } from "commands/ServerCommand";
import { ServerModule } from "commands/ServerModule";
import { MessageNotModifiedError } from "core/MessageNotModifiedError";
import { ILeaderboardResult } from "games/leaderboards/ILeaderboardResult";
import { Mods } from "games/osu/performance/Mods";
import { IGameUserLink } from "games/users/IGameUserLink";
import { LeaderboardSnapshot } from "infrastructure/cache/LeaderboardSnapshot";
import { IKeyboard } from "presentation/keyboard/IKeyboard";
import { makeKeyboard } from "presentation/keyboard/makeKeyboard";

const PAGE_SIZE = 5;
const SNAPSHOT_PAYLOAD_PATTERN = /^\^lb:([a-f0-9]{16}):(\d+)$/;
const SNAPSHOT_NOOP_PAYLOAD_PATTERN = /^\^lbn:([a-f0-9]{16})$/;
const LEGACY_REFRESH_PAYLOAD_PATTERN = /^\^lbr:[a-f0-9]{16}:\d+$/;

export class LeaderboardCommand extends ServerCommand {
    constructor(module: ServerModule) {
        super(["leaderboard", "lb", "ди", "дуфвукищфкв"], module, async (context) => {
            await this.handle(context);
        });
    }

    private async handle(context: CommandContext): Promise<void> {
        if (!context.ctx.isInGroupChat) {
            await context.reply(context.ctx.tr("command-for-chats-only"));
            return;
        }

        if (
            context.isPayload &&
            context.args.full.some((arg) => LEGACY_REFRESH_PAYLOAD_PATTERN.test(arg.toLowerCase()))
        ) {
            await context.answer(context.ctx.tr("leaderboard-cache-expired"));
            return;
        }

        const noopSnapshotId = context.isPayload ? this.parseNoopSnapshotId(context) : undefined;
        if (noopSnapshotId) {
            await this.handleNoopSnapshot(context, noopSnapshotId);
            return;
        }

        const snapshotAction = context.isPayload ? this.parseSnapshotAction(context) : undefined;
        if (snapshotAction) {
            const [id, page] = snapshotAction;
            await this.handleSnapshot(context, id, page);
            return;
        }

        const chat = context.module.bot.chatBeatmaps.getChat(context.ctx.chatId);
        if (!chat) {
            await context.reply(context.ctx.tr("send-beatmap-first"));
            return;
        }
        if (!(await this.acquireRateLimit(context))) {
            return;
        }

        const mods = context.args.mods.length === 0 ? undefined : new Mods(context.args.mods);
        const result = await this.loadLeaderboard(context, chat.map.id, chat.map.mode, mods);
        const useCards = await context.ctx.preferCardsOutput();
        const snapshot = context.module.bot.leaderboards.create(
            context.ctx.chatId,
            context.module.name,
            chat.map.id,
            chat.map.mode,
            mods,
            useCards,
            result
        );

        await this.sendPage(context, snapshot, 1);
    }

    private parseSnapshotAction(context: CommandContext): [string, number] | undefined {
        for (const arg of context.args.full) {
            const match = arg.toLowerCase().match(SNAPSHOT_PAYLOAD_PATTERN);
            if (match) {
                return [match[1], Math.max(Number(match[2]), 1)];
            }
        }
        return undefined;
    }

    private parseNoopSnapshotId(context: CommandContext): string | undefined {
        for (const arg of context.args.full) {
            const match = arg.toLowerCase().match(SNAPSHOT_NOOP_PAYLOAD_PATTERN);
            if (match) {
                return match[1];
            }
        }
        return undefined;
    }

    private async handleNoopSnapshot(context: CommandContext, id: string): Promise<void> {
        const snapshot = context.module.bot.leaderboards.get(id, context.ctx.chatId, context.module.name);
        if (!snapshot) {
            await context.answer(context.ctx.tr("leaderboard-cache-expired"));
            return;
        }
        await context.acknowledge();
    }

    private async handleSnapshot(context: CommandContext, id: string, page: number): Promise<void> {
        const snapshot = context.module.bot.leaderboards.get(id, context.ctx.chatId, context.module.name);
        if (!snapshot) {
            await context.answer(context.ctx.tr("leaderboard-cache-expired"));
            return;
        }

        const maxPage = Math.max(1, Math.ceil(snapshot.result.scores.length / PAGE_SIZE));
        if (page > maxPage) {
            await context.answer(context.ctx.tr("max-page-error", { pages: maxPage }));
            return;
        }

        await context.acknowledge();
        await this.sendPage(context, snapshot, page);
    }

    private async acquireRateLimit(context: CommandContext): Promise<boolean> {
        const isAdmin = await context.ctx.isSenderAdmin();
        const retryAfter = context.module.bot.leaderboards.acquireRateLimit(context.ctx.chatId, isAdmin);
        if (retryAfter <= 0) {
            return true;
        }

        const message = context.ctx.tr("leaderboard-rate-limited", {
            seconds: Math.ceil(retryAfter / 1000),
        });
        if (context.isPayload) {
            await context.answer(message);
        } else {
            await context.reply(message);
        }
        return false;
    }

    private async loadLeaderboard(
        context: CommandContext,
        beatmapId: number,
        mode: number,
        mods?: Mods
    ): Promise<ILeaderboardResult> {
        const profiles = await context.module.bot.storage.memberships.getChatUsers(context.ctx.chatId);
        const users: IGameUserLink[] = [];
        for (const profile of profiles) {
            const identity = await context.module.bot.storage.identities.getUser(profile);
            if (!identity) {
                continue;
            }
            const user = await context.module.db.getUser(identity.userId);
            if (user && !users.some((candidate) => candidate.game_id == user.game_id)) {
                users.push(user);
            }
        }

        return await getLeaderboard(context.module.api, context.module.beatmapProvider, beatmapId, users, mode, mods);
    }

    private async sendPage(context: CommandContext, snapshot: LeaderboardSnapshot, page: number): Promise<void> {
        const result = snapshot.result;
        const maxPage = Math.max(1, Math.ceil(result.scores.length / PAGE_SIZE));
        if (page > maxPage) {
            const message = context.ctx.tr("max-page-error", { pages: maxPage });
            if (context.isPayload) {
                await context.answer(message);
            } else {
                await context.reply(message);
            }
            return;
        }

        const startIndex = (page - 1) * PAGE_SIZE;
        const pageResult: ILeaderboardResult = {
            map: result.map,
            scores: result.scores.slice(startIndex, startIndex + PAGE_SIZE),
        };
        const data = await context.module.bot.replies.leaderboard(
            context.ctx,
            pageResult,
            context.module.link,
            startIndex + 1,
            snapshot.useCards
        );
        let text = data.text;
        if (!(await context.ctx.isBotAdmin())) {
            text += "\n\n" + context.ctx.tr("bot-is-not-admin-leaderboard");
        }
        const keyboard = this.createKeyboard(context, snapshot.id, page, maxPage);

        if (!context.isPayload) {
            await context.reply(text, { keyboard, photo: data.photo });
            return;
        }

        try {
            await context.edit(text, { keyboard, photo: data.photo });
        } catch (error) {
            if (error instanceof MessageNotModifiedError) {
                return;
            }
            throw error;
        }
    }

    private createKeyboard(context: CommandContext, id: string, page: number, maxPage: number): IKeyboard {
        const prefix = context.module.prefix[0];
        const noopCommand = `${prefix} lb ^lbn:${id}`;
        const previousCommand = page > 1 ? `${prefix} lb ^lb:${id}:${page - 1}` : noopCommand;
        const nextCommand = page < maxPage ? `${prefix} lb ^lb:${id}:${page + 1}` : noopCommand;
        return makeKeyboard([
            [
                { text: "⬅️", command: previousCommand },
                { text: `${page}/${maxPage}`, command: noopCommand },
                { text: "➡️", command: nextCommand },
            ],
        ]);
    }
}

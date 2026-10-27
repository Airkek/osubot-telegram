import { ServerModule } from "commands/ServerModule";
import { ServerCommand } from "commands/ServerCommand";
import { IGameUser } from "games/users/IGameUser";
import { UserNotFoundError } from "core/errors/UserNotFoundError";
import { InvalidLinkCodeError } from "core/errors/InvalidLinkCodeError";
import { GameServerName } from "core/storage/GameServerName";

export class LinkCommand extends ServerCommand {
    constructor(module: ServerModule, server: GameServerName) {
        super(["link", "nick", "n", "дштл", "т", "тшсл"], module, async (self) => {
            const service = self.module.bot.linkService;
            let supported: boolean;
            try {
                supported = (await service.getSupportedServers()).includes(server);
            } catch {
                await self.reply(self.ctx.tr("link-service-unavailable"));
                return;
            }

            if (!supported) {
                if (!self.args.nickname[0]) {
                    await self.reply(self.ctx.tr("nickname-not-specified", { prefix: self.module.prefix[0] }));
                    return;
                }
                let user: IGameUser;
                try {
                    user = await self.module.api.getUser(self.args.nickname.join(" "));
                } catch (error) {
                    if (error instanceof UserNotFoundError) {
                        await self.reply(self.ctx.tr("user-not-found"));
                        return;
                    }
                    throw error;
                }
                await self.module.db.setNickname(self.ctx.userId, user.id, user.nickname, user.mode);
                await self.reply(`${self.ctx.tr("nickname-set")}: ${user.nickname}`);
                return;
            }

            const url = service.getPageUrl(server);
            const messageArgs = { prefix: self.module.prefix[0], url };
            if (!self.args.full[0]) {
                await self.reply(self.ctx.tr("link-code-not-specified-with-url", messageArgs));
                return;
            }

            let user: IGameUser;
            let isRestricted: boolean;
            try {
                const linked = await service.verifyCode(server, self.args.full[0]);
                user = await self.module.api.getUserById(linked.userId);
                isRestricted = linked.isRestricted;
            } catch (error) {
                const key =
                    error instanceof InvalidLinkCodeError
                        ? "link-code-invalid"
                        : error instanceof UserNotFoundError
                          ? "user-not-found"
                          : "link-service-unavailable";
                await self.reply(self.ctx.tr(key, messageArgs));
                return;
            }
            await self.module.db.setNickname(self.ctx.userId, user.id, user.nickname, user.mode);
            let text = `${self.ctx.tr("nickname-set")}: ${user.nickname}`;
            if (isRestricted) {
                text += `\n${self.ctx.tr("link-restricted-warning")}`;
            }
            await self.reply(text);
        });
    }
}

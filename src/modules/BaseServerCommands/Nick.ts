import { Command } from '../../Command';
import { Module } from '../../Module';

export default class AbstractNick extends Command {
    constructor(module: Module) {
        super(["nick", "n", "т", "тшсл"], module, async (ctx, self, args) => {
            if(!args.nickname[0])
                return ctx.reply(`Не указан ник!\nИспользование: ${module.prefix[0]} nick <ник>`);
            try {
                let user = await self.module.api.getUser(args.nickname.join(" "));
                await self.module.db.setNickname(ctx.senderId, user.id, user.nickname);
                if (user.mode) {
                    await self.module.db.setMode(ctx.senderId, user.mode)
                }
                ctx.reply(`[Server: ${self.module.name}]\nУстановлен ник: ${user.nickname}`);
            } catch(err) {
                ctx.reply("Такого пользователя не существует!");
            }
        });
    }
}
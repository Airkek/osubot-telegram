import { Command } from '../../Command';
import { Module } from '../../Module';

export default class BanchoNick extends Command {
    constructor(module: Module) {
        super(["nick", "n", "т", "тшсл"], module, async (ctx, self, args) => {
            if(!args.nickname[0])
                return ctx.reply("Не указан ник!");
            try {
                let user = await self.module.bot.v2.getUser(args.nickname.join(" "));
                await self.module.bot.database.servers.bancho.setNickname(ctx.senderId, user.id, user.nickname);
                ctx.reply(`[Server: ${self.module.name}]\nУстановлен ник: ${args.nickname.join(" ")}`);
            } catch(err) {
                ctx.reply("Такого пользователя не существует!");
            }
        });
    }
}
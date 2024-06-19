import { Command } from '../../Command';
import { Module } from '../../Module';

export default class AbstractMode extends Command {
    constructor(module: Module) {
        super(["mode", "m", "ь", "ьщву"], module, async (ctx, self, args) => {
            if(!args.full[0])
                return ctx.reply(`Не указан режим!\nИспользование: ${self.module.prefix[0]} mode <mode>\nДоступные моды:\n0 - osu!\n1 - Taiko\n2 - Fruits\n3 - Mania`);
            let m = parseInt(args.full[0]);
            if(isNaN(m) || m > 3 || m < 0)
                return ctx.reply("Некорректный режим!\nДоступные моды:\n0 - osu!\n1 - Taiko\n2 - Fruits\n3 - Mania");
            await self.module.db.setMode(ctx.senderId, m);
            ctx.reply(`[Server: ${self.module.name}]\nРежим установлен!`);
        });
    }
}
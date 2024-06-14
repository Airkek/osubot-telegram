import { Command } from "../../Command";
import { Module } from "../../Module";

export default class DisableCommand extends Command {
    disables = false;
    
    constructor(module: Module) {
        super(["disable"], module, async (ctx, self) => {
            if(!ctx.isChat)
                return ctx.reply("Данная команда только для чатов!")

            try {
                if(!ctx.isAdmin)
                    return;

                let isDisabled = self.module.bot.disabled.includes(ctx.peerId);

                if(isDisabled)
                    self.module.bot.disabled = self.module.bot.disabled.filter(d => d != ctx.peerId);
                else
                    self.module.bot.disabled.push(ctx.peerId);
                
                ctx.reply(`Бот ${isDisabled ? 'включен' : 'отключен'}`);
            } catch {}
        })
    }
}
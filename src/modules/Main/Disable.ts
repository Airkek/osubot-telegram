import { Command } from "../../Command";
import { Module } from "../../Module";

export default class DisableCommand extends Command {
    disables = false;
    
    constructor(module: Module) {
        super(["disable"], module, async (ctx, self) => {
            if(!ctx.isChat)
                return ctx.reply("Данная команда только для чатов!")

            try {
                let { items } = (await self.module.bot.vk.api.messages.getConversationMembers({
                    peer_id: ctx.peerId
                }));
                let user = items.find(m => m.member_id == ctx.senderId);

                if(!user.is_admin)
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
import { Command } from '../../Command';
import { Module } from '../../Module';

export default class DropCommand extends Command {
    constructor(module: Module) {
        super(['drop', 'вкщз'], module, async (ctx, self) => {
            const context = ctx.replyMessage;

            if (!context) {
                await ctx.send('Перешлите сообщение!');
                return;
            }
            
            await self.module.bot.database.drop.dropUser(context.senderId);

            await ctx.send(`Привязки ников tg://user?id=${context.senderId} удалены!`, {
                disable_mentions: 1
            });
        });

        this.permission = (ctx) => ctx.senderId == module.bot.config.tg.owner;
    }
}
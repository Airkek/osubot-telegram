import { Command } from "../../Command";
import { Module } from "../../Module";

const types = ['group', 'osuupdate', 'newranked', 'osunews'];

export default class NewsCommand extends Command {
    constructor(module: Module) {
        super(["news", "туцы"], module, async (ctx, self, args) => {

            if(ctx.isChat) {
                try {    
                    if(!(await ctx.isAdmin()))
                        return ctx.reply("Вы не можете управлять рассылкой!");
                    
                    if(!args.string[0])
                        return ctx.send(`Укажите тип рассылки! (${types.join("/")})`);
    
                    if(!types.includes(args.string[0].toLowerCase()))
                        return ctx.send(`Неизвестный тип рассылки!`);
    
                    let n = self.module.bot.news.chatSwitch(ctx.peerId, args.string[0].toLowerCase());
    
                    ctx.reply(`Рассылка ${args.string[0].toLowerCase()} ${n ? 'включена' : 'отключена'}!`);
                } catch(e) {
                    ctx.reply("Мне нужны права администратора, чтобы проверить, являетесь ли Вы администратором!");
                }
            } else {
                if(!args.string[0])
                    return ctx.send(`Укажите тип рассылки! (${types.join("/")})`);

                if(!types.includes(args.string[0].toLowerCase()))
                    return ctx.send(`Неизвестный тип рассылки!`);

                let n = self.module.bot.news.userSwitch(ctx.peerId, args.string[0].toLowerCase());

                ctx.reply(`Рассылка ${args.string[0].toLowerCase()} ${n ? 'включена' : 'отключена'}!`);
            }
        });
    }
}
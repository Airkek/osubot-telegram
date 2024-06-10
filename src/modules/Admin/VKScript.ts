import { Command } from "../../Command";
import { Module } from "../../Module";

export default class AdminVKScript extends Command {
    constructor(module: Module) {
        super(["vks", "vkscript", "млы", "млыскшзе"], module, async (ctx, self, args) => {
            // let code = args.full.join(" ");
            // try {
            //     let res = await self.module.bot.vk.api.execute({ code });
            //     ctx.reply(
            //         typeof res == "object" ? 
            //         JSON.stringify(res) : (res || "null")
            //     );
            // } catch(e) {
            //     ctx.reply("Ошибка при выполнении кода!");
            // }
        });

        this.permission = (ctx) => ctx.senderId == module.bot.config.tg.owner;
    }
}
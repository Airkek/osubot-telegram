import { Command } from "../../Command";
import { Module } from "../../Module";

export default class EvalCommand extends Command {
    constructor(module: Module) {
        super(["eval", "умфд"], module, async (ctx, self, args) => {
            try {
                let res = eval(args.full.join(" "));
                ctx.send(`Успех!\nТип данных: ${typeof res}\n\n${String(res)}`);
            } catch(e) {
                ctx.send(`Ошибка!\n${String(e)}`);
            }
        });

        this.permission = (ctx) => ctx.senderId == module.bot.config.tg.owner;
    }
}
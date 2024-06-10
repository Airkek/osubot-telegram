import { Command } from "../../Command";
import { Module } from "../../Module";
import * as axios from "axios";
import fs from "fs";

export default class UploadCommand extends Command {
    constructor(module: Module) {
        super(["upload", "гздщфв"], module, async (ctx, self, args) => {
            if(!ctx.getAttachments("doc")[0])
                return ctx.reply("Нет вложений!");
            
            let path = args.full.join("+");
            let { data } = await axios.default.get(ctx.getAttachments("doc")[0].url, {
                responseType: "arraybuffer"
            });
            fs.writeFileSync(path, data);

            ctx.reply("Файл успешно загружен!");
        });

        this.permission = (ctx) => ctx.senderId == module.bot.config.tg.owner;
    }
}
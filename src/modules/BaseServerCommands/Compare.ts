import { Module } from "../../Module";
import Mods from "../../pp/Mods";
import Calculator from "../../pp/bancho";
import { ServerCommand } from "./BasicServerCommand";

export default class AbstractCompare extends ServerCommand {
    constructor(module: Module) {
        super(
            ["compare", "c", "с", "сщьзфку"],
            module,
            async (self) => {
                const mode = self.args.mode === null ? self.user.dbUser?.mode || 0 : self.args.mode;
                const chat = self.module.bot.maps.getChat(self.ctx.peerId);
                if (!chat) {
                    await self.ctx.reply("Сначала отправьте карту!");
                    return;
                }
                const score = self.user.username
                    ? await self.module.api.getScore(
                          self.user.username,
                          chat.map.id.map,
                          mode,
                          self.args.mods.length == 0 ? undefined : new Mods(self.args.mods).sum()
                      )
                    : await self.module.api.getScoreByUid(
                          self.user.id || self.user.dbUser.game_id,
                          chat.map.id.map,
                          mode,
                          self.args.mods.length == 0 ? undefined : new Mods(self.args.mods).sum()
                      );
                const map = score.beatmap ?? (await self.module.api.getBeatmap(chat.map.id.map, mode, score.mods));
                const cover = await self.module.bot.database.covers.getCover(map.id.set);
                const calc = new Calculator(map, score.mods);
                await self.reply(
                    `Лучший скор игрока на этой карте:\n${self.module.bot.templates.ScoreFull(
                        score,
                        map,
                        calc,
                        self.module.link
                    )}`,
                    {
                        attachment: cover,
                    }
                );
            },
            true
        );
    }
}

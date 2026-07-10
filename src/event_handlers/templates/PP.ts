import BanchoPP from "../../osu_specific/pp/bancho";
import Util from "../../Util";
import { IBeatmap } from "../../beatmaps/BeatmapTypes";
import { ILocalisator } from "../../ILocalisator";
import { PPArgs } from "../../Types";

export default async function (l: ILocalisator, map: IBeatmap, args: PPArgs): Promise<string> {
    const calc = new BanchoPP(map, map.currentMods);
    const ppArgs = Util.createPPArgs(args, map.mode);

    const pp = await calc.calculate(ppArgs);

    return `${Util.formatBeatmap(map)} ${calc.mods.toString()}
${l.tr("score-accuracy")}: ${(ppArgs.acc * 100).toFixed(2)}%${
        map.mode !== 3
            ? `
${l.tr("score-combo")}: ${Util.formatCombo(ppArgs.combo, map.maxCombo)} | ${l.tr("score-misses-calc", {
                  count: ppArgs.counts.hitData.miss,
              })}`
            : ""
    }
- PP: ${Util.round(pp.pp, 2)}
`.trim();
}

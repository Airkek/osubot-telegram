import BanchoPP from "../../osu_specific/pp/bancho";
import Mods from "../../osu_specific/pp/Mods";
import Util from "../../Util";
import { IBeatmap } from "../../beatmaps/BeatmapTypes";
import { ICommandArgs } from "../Command";
import { ILocalisator } from "../../ILocalisator";

export default function (l: ILocalisator, map: IBeatmap, args: ICommandArgs): string {
    const calc = new BanchoPP(map, new Mods(args.mods));

    const hits = map.hitObjectsCount;

    const accuracy = args.acc / 100 || 1;
    const maxCombo = args.combo ? Math.min(map.maxCombo, Math.max(1, args.combo)) : map.maxCombo;
    const missCount = args.miss ? Math.min(hits, Math.max(0, args.miss)) : 0;

    const ppArgs = Util.createPPArgs(
        {
            acc: accuracy,
            combo: maxCombo,
            hits,
            miss: missCount,
            mods: new Mods(args.mods),
            counts: {
                50: args.c50,
            },
        },
        map.mode
    );

    const pp = calc.calculate(ppArgs);

    return `${Util.formatBeatmap(map)} ${calc.mods.toString()}
${l.tr("score-accuracy")}: ${Util.round(ppArgs.acc * 100, 2)}%${
        map.mode !== 3
            ? `
${l.tr("score-combo")}: ${Util.formatCombo(ppArgs.combo, map.maxCombo)} | ${l.tr("score-misses-calc", {
                  count: ppArgs.counts.miss,
              })}`
            : ""
    }
- PP: ${Util.round(pp.pp, 2)}
`.trim();
}

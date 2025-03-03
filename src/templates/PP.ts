import { ICommandArgs, APIBeatmap } from "../Types";
import BanchoPP from "../pp/bancho";
import Mods from "../pp/Mods";
import Util from "../Util";

export default function (map: APIBeatmap, args: ICommandArgs): string {
    const calc = new BanchoPP(map, new Mods(args.mods));

    let hits = map.objects.circles + map.objects.sliders + map.objects.spinners;

    if (map.mode === 1) {
        hits -= map.objects.sliders;
    }

    if (map.mode === 1 || map.mode === 3) {
        hits -= map.objects.spinners;
    }

    const accuracy = args.acc / 100 || 1;
    const maxCombo = args.combo ? Math.min(map.combo, Math.max(1, args.combo)) : map.combo;
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
Accuracy: ${Util.round(ppArgs.acc * 100, 2)}%${
        map.mode !== 3
            ? `
Combo: ${Util.formatCombo(ppArgs.combo, map.combo)} | ${ppArgs.counts.miss} misses`
            : ""
    }
- PP: ${Util.round(pp.pp, 2)}
`.trim();
}

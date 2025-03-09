import { ProfileMode } from "../../Types";
import BanchoPP from "../../osu_specific/pp/bancho";
import Util from "../../Util";
import Mods from "../../osu_specific/pp/Mods";
import { IBeatmap } from "../../beatmaps/BeatmapTypes";

interface PPResults {
    pp98: number;
    pp99: number;
    pp100: number;
}

export default function formatBeatmapInfo(map: IBeatmap): string {
    const mapText = Util.formatBeatmap(map);
    const calculator = new BanchoPP(map, new Mods(0));

    const getStandardPP = (accuracy: number): number => {
        return calculator.calculate(
            Util.createPPArgs(
                {
                    acc: accuracy,
                    combo: map.maxCombo,
                    hits: map.hitObjectsCount,
                    miss: 0,
                    mods: new Mods(0),
                },
                map.mode
            )
        ).pp;
    };

    const getManiaPP = (): number => {
        return calculator.calculate(
            Util.createPPArgs(
                {
                    hits: map.hitObjectsCount,
                    score: 1_000_000,
                    mods: new Mods(0),
                },
                map.mode
            )
        ).pp;
    };

    const formatPPResults = ({ pp98, pp99, pp100 }: PPResults): string =>
        `PP:
- 98% = ${Util.round(pp98, 2)}
- 99% = ${Util.round(pp99, 2)}
- 100% = ${Util.round(pp100, 2)}`;

    let content: string;

    switch (map.mode) {
        case ProfileMode.STD:
        case ProfileMode.Taiko:
        case ProfileMode.Catch: {
            const pp98 = getStandardPP(0.98);
            const pp99 = getStandardPP(0.99);
            const pp100 = getStandardPP(1.0);
            content = formatPPResults({ pp98, pp99, pp100 });
            break;
        }

        case ProfileMode.Mania: {
            const pp = getManiaPP();
            content = `PP (1M score): ${Util.round(pp, 2)}`;
            break;
        }

        default:
            return "Произошла ошибка: неизвестный режим игры!";
    }

    return `${mapText}\n${content}`;
}

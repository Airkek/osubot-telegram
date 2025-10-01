import { ProfileMode } from "../../Types";
import BanchoPP from "../../osu_specific/pp/bancho";
import Util from "../../Util";
import Mods from "../../osu_specific/pp/Mods";
import { IBeatmap } from "../../beatmaps/BeatmapTypes";
import { ILocalisator } from "../../ILocalisator";
import { IPP } from "../../osu_specific/pp/Calculator";

interface PPResults {
    pp98: number;
    pp99: number;
    pp100: number;
}

export default async function formatBeatmapInfo(l: ILocalisator, map: IBeatmap): Promise<string> {
    const mapText = Util.formatBeatmap(map);
    const calculator = new BanchoPP(map, new Mods(0));

    const getStandardPP = (accuracy: number): Promise<IPP> => {
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
        );
    };

    const getManiaPP = (): Promise<IPP> => {
        return calculator.calculate(
            Util.createPPArgs(
                {
                    hits: map.hitObjectsCount,
                    score: 1_000_000,
                    mods: new Mods(0),
                },
                map.mode
            )
        );
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
            const pp98 = await getStandardPP(0.98);
            const pp99 = await getStandardPP(0.99);
            content = formatPPResults({ pp98: pp98.pp, pp99: pp99.pp, pp100: pp98.ss });
            break;
        }

        case ProfileMode.Mania: {
            const pp = await getManiaPP();
            content = `PP (1M score): ${Util.round(pp.pp, 2)}`;
            break;
        }

        default:
            return l.tr("unknown-game-mode-error");
    }

    return `${mapText}\n${content}`;
}

import { Replay } from "../Replay";
import { APIBeatmap } from "../Types";
import Util from "../Util";
import { IPPCalculator as ICalc } from "../pp/Calculator";

export default function formatReplay(
    replay: Replay,
    map: APIBeatmap,
    calc: ICalc
): string {
    const pp = calc.calculate(replay);

    const header = `${replay.player}'s replay:`;
    const mapLine = `${Util.formatBeatmap(map)} ${replay.mods}`;

    const gameStats = [
        `Score: ${replay.score.toLocaleString()}`,
        `Combo: ${Util.formatCombo(replay.combo, map.combo)}`,
    ].join(" | ");

    const accuracy = `Accuracy: ${Util.round(replay.accuracy() * 100, 2)}%`;

    let ppInfo = `PP: ${Util.round(pp.pp, 2)}`;
    if (pp.ss !== pp.pp) {
        ppInfo +=
            pp.fc === pp.pp
                ? ` → SS: ${Util.round(pp.ss, 2)}`
                : ` → FC: ${Util.round(pp.fc, 2)} → SS: ${Util.round(pp.ss, 2)}`;
    }

    const additionalInfo = `Hitcounts: ${replay.counts.toString()}`;

    return [
        header,
        "",
        mapLine,
        "",
        gameStats,
        accuracy,
        ppInfo,
        additionalInfo,
    ].join("\n");
}

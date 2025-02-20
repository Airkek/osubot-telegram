import { APIScore, APIBeatmap } from "../Types";
import Util from "../Util";
import { IPPCalculator as ICalc } from "../pp/Calculator";

export default function formatTopScore(
    score: APIScore,
    map: APIBeatmap,
    calc: ICalc
): string {
    const pp = calc.calculate(score);

    const header = `Top score on ${Util.formatBeatmap(map)} ${score.mods}`;

    const dateInfo = `${Util.formatDate(score.date)}`;

    const gameStats = [
        `Score: ${score.score.toLocaleString()}`,
        `Combo: ${Util.formatCombo(score.combo, map.combo)}`,
    ].join(" | ");
    const accuracy = `Accuracy: ${Util.round(score.accuracy() * 100, 2)}%`;

    const basePP = score.pp !== undefined ? score.pp : Util.round(pp.pp, 2);
    let ppInfo = `PP: ${basePP}`;

    if (pp.ss !== pp.pp) {
        ppInfo +=
            pp.fc === pp.pp
                ? ` → SS: ${Util.round(pp.ss, 2)}`
                : ` → FC: ${Util.round(pp.fc, 2)} → SS: ${Util.round(pp.ss, 2)}`;
    }

    const additionalInfo = [
        `Hitcounts: ${score.counts}`,
        `Grade: ${score.rank}`,
    ].join("\n");

    return [
        header,
        "",
        dateInfo,
        gameStats,
        accuracy,
        ppInfo,
        additionalInfo,
    ].join("\n");
}

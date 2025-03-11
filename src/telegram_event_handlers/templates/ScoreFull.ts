import { APIScore } from "../../Types";
import Util from "../../Util";
import { IPPCalculator as ICalc } from "../../osu_specific/pp/Calculator";
import { IBeatmap } from "../../beatmaps/BeatmapTypes";

export default function (score: APIScore, beatmap: IBeatmap, calc: ICalc, serverLink: string) {
    const pp = score.fcPp ? { pp: score.pp, fc: score.fcPp, ss: undefined } : calc.calculate(score);

    let ppString = `PP: ${score.pp ? score.pp.toFixed(2) : pp.pp.toFixed(2)}`;
    if (pp.fc !== undefined && pp.fc !== pp.pp) {
        ppString += ` → FC: ${pp.fc.toFixed(2)}`;
    }

    if (pp.ss !== undefined && pp.ss !== pp.pp) {
        ppString += ` → SS: ${pp.ss.toFixed(2)}`;
    }

    const hits = beatmap.hitObjectsCount;
    const progress = score.counts.totalHits() / hits;
    const gradeProgress = score.rank === "F" ? ` (${Util.round(progress * 100, 2)}%)` : "";

    const beatmapUrl = beatmap.url ?? `${serverLink}/b/${beatmap.id}`;

    const total = [
        `${Util.formatBeatmap(beatmap)} ${score.mods}`,
        "",
        `Score: ${score.score?.toLocaleString()}`,
        `Combo: ${Util.formatCombo(score.combo, beatmap.maxCombo)}`,
        `Accuracy: ${Util.round(score.accuracy() * 100, 2)}%`,
        ppString,
        `Hitcounts: ${score.counts.toString()}`,
        `Grade: ${score.rank}${gradeProgress}`,
    ];

    if (score.date) {
        total.push(`Date: ${Util.formatDate(score.date)}`);
    }

    if (score.rank_global && score.rank_global <= 1000) {
        let rankStr = `#${score.rank_global} место на карте`;
        if (score.rank_global <= 50) {
            rankStr = `🏆 ${rankStr}`;
        }

        total.push(rankStr);
    }

    if (score.top100_number) {
        total.push(`🏆 Персональный топскор #${score.top100_number}`);
    }

    total.push(`\nBeatmap: ${beatmapUrl}`);
    return total.join("\n");
}

import { APIScore, APIBeatmap, ProfileMode } from "../Types";
import Util from "../Util";
import { IPPCalculator as ICalc } from "../pp/Calculator";

export default function (
    score: APIScore,
    beatmap: APIBeatmap,
    calc: ICalc,
    serverLink: string
) {
    const pp = score.fcPp
        ? { pp: score.pp, fc: score.fcPp, ss: undefined }
        : calc.calculate(score);

    let ppString = `PP: ${score.pp ? score.pp.toFixed(2) : pp.pp.toFixed(2)}`;
    if (pp.fc !== undefined && pp.fc !== pp.pp) {
        ppString += ` → FC: ${pp.fc.toFixed(2)}`;
    }

    if (pp.ss !== undefined && pp.ss !== pp.pp) {
        ppString += ` → SS: ${pp.ss.toFixed(2)}`;
    }

    let hits =
        beatmap.objects.circles +
        beatmap.objects.sliders +
        beatmap.objects.spinners;
    if (score.mode === ProfileMode.Taiko) {
        hits -= beatmap.objects.sliders;
    }

    if (score.mode === ProfileMode.Taiko || score.mode === ProfileMode.Mania) {
        hits -= beatmap.objects.spinners;
    }

    const progress = score.counts.totalHits() / hits;
    const gradeProgress =
        score.rank === "F" ? ` (${Util.round(progress * 100, 2)}%)` : "";

    const beatmapUrl = beatmap.mapUrl ?? `${serverLink}/b/${beatmap.id.map}`;

    const total = [
        `${Util.formatBeatmap(beatmap)} ${score.mods}`,
        "",
        `Score: ${score.score.toLocaleString()}`,
        `Combo: ${Util.formatCombo(score.combo, beatmap.combo)}`,
        `Accuracy: ${Util.round(score.accuracy() * 100, 2)}%`,
        ppString,
        `Hitcounts: ${score.counts.toString()}`,
        `Grade: ${score.rank}${gradeProgress}`,
        `Date: ${Util.formatDate(score.date)}`,
    ];

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

import { APITopScore, APIBeatmap, APIRecentScore, APIScore, CalcArgs } from '../Types';
import { ICalcStats } from './Stats';
import Mods from './Mods';
import { Replay } from '../Replay';

interface IPP {
    pp: number,
    fc: number,
    ss: number
}

interface ModePP {
    map: APIBeatmap,
    mods: Mods,
    value: IPP
}

interface IPPCalculator {
    speedMultiplier: number,
    map: APIBeatmap,
    mods: Mods,
    stats: ICalcStats,
    calculate(score: APITopScore | APIRecentScore | APIScore | Replay | CalcArgs): IPP,
    PP(score: APITopScore | APIRecentScore | APIScore | Replay | CalcArgs): ModePP
}

export {
    IPP,
    IPPCalculator
}
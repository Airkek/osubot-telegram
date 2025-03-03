import { APIBeatmap, APIScore, CalcArgs } from "../Types";
import { ICalcStats } from "./Stats";
import * as rosu from "rosu-pp-js";
import Mods from "./Mods";
import { Replay } from "../Replay";

interface IPP {
    pp: number;
    fc: number;
    ss: number;
}

interface IPPCalculator {
    speedMultiplier: number;
    map: APIBeatmap;
    mods: Mods;
    stats: ICalcStats;
    calculate(score: APIScore | APIScore | APIScore | Replay | CalcArgs): IPP;
    PP(score: APIScore | APIScore | APIScore | Replay | CalcArgs, rmap: rosu.Beatmap): IPP;
}

export { IPP, IPPCalculator };

import { APIScore, CalcArgs } from "../Types";
import * as rosu from "rosu-pp-js";
import Mods from "./Mods";
import { Replay } from "../Replay";
import { IBeatmap } from "../beatmaps/BeatmapTypes";

interface IPP {
    pp: number;
    fc: number;
    ss: number;
}

interface IPPCalculator {
    speedMultiplier: number;
    map: IBeatmap;
    mods: Mods;
    calculate(score: APIScore | Replay | CalcArgs): IPP;
    PP(score: APIScore | Replay | CalcArgs, rmap: rosu.Beatmap): IPP;
}

export { IPP, IPPCalculator };

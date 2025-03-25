import { APIScore, CalcArgs } from "../../Types";
import * as rosu from "@kotrikd/rosu-pp";
import Mods from "./Mods";
import { OsrReplay } from "../OsrReplay";
import { IBeatmap } from "../../beatmaps/BeatmapTypes";

interface IPP {
    pp: number;
    fc: number;
    ss: number;
}

interface IPPCalculator {
    speedMultiplier: number;
    map: IBeatmap;
    mods: Mods;
    calculate(score: APIScore | OsrReplay | CalcArgs): IPP;
    PP(score: APIScore | OsrReplay | CalcArgs, rmap: rosu.Beatmap): IPP;
}

export { IPP, IPPCalculator };

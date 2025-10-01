import { APIScore, CalcArgs } from "../../Types";
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
    calculate(score: APIScore | OsrReplay | CalcArgs): Promise<IPP>;
}

export { IPP, IPPCalculator };

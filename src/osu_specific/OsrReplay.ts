import { Score } from "osu-classes";
import { HitCounts } from "../Types";
import Mods from "./pp/Mods";
import Util from "../Util";

class OsrReplay {
    mode: number;
    beatmapHash: string;
    player: string;
    counts: HitCounts;
    score: number;
    combo: number;
    perfect: number;
    mods: Mods;
    fake?: boolean;
    constructor(score?: Score) {
        if (!score) {
            return;
        }

        this.mode = score.info.rulesetId;
        this.beatmapHash = score.info.beatmapHashMD5;
        this.player = score.info.username;
        this.counts = new HitCounts(
            {
                300: score.info.count300,
                100: score.info.count100,
                50: score.info.count50,
                geki: score.info.countGeki,
                katu: score.info.countKatu,
                miss: score.info.countMiss,
            },
            this.mode
        );
        this.score = score.info.totalScore;
        this.combo = score.info.maxCombo;
        this.perfect = score.info.perfect ? 1 : 0;
        this.mods = new Mods(score.info.rawMods);
        if (score.replay.gameVersion >= 30000000) {
            // Lazer is 1000 years in the future
            this.mods.lazer = true;
        }
    }

    accuracy() {
        return Util.accuracy(this.counts);
    }
}

export { OsrReplay };

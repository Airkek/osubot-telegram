import { isBuffer } from "util";
import leb from "leb";
import int64 from "int64-buffer";
import { HitCounts } from "./Types";
import Mods from "./pp/Mods";
import Util from "./Util";

class Replay {
    mode: number;
    version: number;
    beatmapHash: string;
    player: string;
    replayHash: string;
    counts: HitCounts;
    score: number;
    combo: number;
    perfect: number;
    mods: Mods;
    fake?: boolean
    constructor() { }

    accuracy() {
        return Util.accuracy(this.counts);
    }
}

class ReplayParser {
    raw_data: Buffer;
    offset: number;
    constructor(replay: string | Buffer) {
        this.raw_data = isBuffer(replay) ? replay : Buffer.from(replay);
        this.offset = 0x00;
    }

    getReplay(): Replay {
        let replay = new Replay();
        replay.mode = this.byte();
        replay.version = this.int();
        replay.beatmapHash = this.string();
        replay.player = this.string();
        replay.replayHash = this.string();

        replay.counts = new HitCounts({
            300: this.short(),
            100: this.short(),
            50: this.short(),
            geki: this.short(),
            katu: this.short(),
            miss: this.short()
        }, replay.mode);

        replay.score = this.int();
        replay.combo = this.short();
        replay.perfect = this.byte();

        replay.mods = new Mods(this.int());

        return replay;
    }

    byte() {
        this.offset += 1;
        return this.raw_data.readInt8(this.offset - 1);
    }

    short() {
        this.offset += 2;
        return this.raw_data.readUIntLE(this.offset - 2, 2);
    }

    int() {
        this.offset += 4;
        return this.raw_data.readInt32LE(this.offset - 4);
    }

    long() {
        this.offset += 8;
        return new int64.Uint64LE(this.raw_data.slice(this.offset - 8, this.offset)).toNumber();
    }

    string() {
        if(this.raw_data.readInt8(this.offset) == 0x0b) {
            this.offset += 1;
            let ulString = leb.decodeUInt64(this.raw_data.slice(this.offset, this.offset + 8));
            let strLength = ulString.value;
            this.offset += strLength + ulString.nextIndex;
            return this.raw_data.slice(this.offset - strLength, this.offset).toString();
        } else {
            this.offset += 1;
            return "";
        }
    }
}

export {
    Replay,
    ReplayParser
}
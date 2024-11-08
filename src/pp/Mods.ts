import { V2Mod } from "../Types";

enum ModsBitwise {
    Nomod = 0,
    NoFail = 1 << 0,
	Easy = 1 << 1,
	TouchDevice = 1 << 2,
	Hidden = 1 << 3,
	HardRock = 1 << 4,
	SuddenDeath = 1 << 5,
	DoubleTime = 1 << 6,
	Relax = 1 << 7,
	HalfTime = 1 << 8,
	Nightcore = 1 << 9,
	Flashlight = 1 << 10,
	Autoplay = 1 << 11,
	SpunOut = 1 << 12,
	Relax2 = 1 << 13,
	Perfect = 1 << 14,
	Key4 = 1 << 15,
	Key5 = 1 << 16,
	Key6 = 1 << 17,
	Key7 = 1 << 18,
	Key8 = 1 << 19,
	FadeIn = 1 << 20,
	Random = 1 << 21,
	Cinema = 1 << 22,
	Target = 1 << 23,
	Key9 = 1 << 24,
	Key10 = 1 << 25,
	Key1 = 1 << 26,
	Key3 = 1 << 27,
	Key2 = 1 << 28,
	ScoreV2 = 1 << 29,
    Mirror = 1 << 30,
	DifficultyChanging = Easy | HardRock | DoubleTime | HalfTime | Nightcore,
	Unranked = Relax | Autoplay | Relax2 | Cinema | Target | ScoreV2
};

enum ModsAcronyms {
	"NF" = "NoFail",
	"EZ" = "Easy",
	"TD" = "TouchDevice",
	"HD" = "Hidden",
	"HR" = "HardRock",
	"SD" = "SuddenDeath",
	"DT" = "DoubleTime",
	"RX" = "Relax",
	"HT" = "HalfTime",
	"NC" = "Nightcore",
	"FL" = "Flashlight",
	"AT" = "Autoplay",
	"SO" = "SpunOut",
	"AP" = "Relax2",
	"PF" = "Perfect",
	"K4" = "Key4",
	"K5" = "Key5",
	"K6" = "Key6",
	"K7" = "Key7",
	"K8" = "Key8",
	"FI" = "FadeIn",
	"RN" = "Random",
	"CN" = "Cinema",
	"TP" = "Target",
	"K9" = "Key9",
	"KX" = "Key10",
	"K1" = "Key1",
	"K3" = "Key3",
	"K2" = "Key2",
	"V2" = "ScoreV2",
	"MR" = "Mirror"
};

enum ModsAcronyms2 {
    NoFail = "NF",
	Easy = "EZ",
	TouchDevice = "TD",
	Hidden = "HD",
	HardRock = "HR",
	SuddenDeath = "SD",
	DoubleTime = "DT",
	Relax = "RX",
	HalfTime = "HT",
	Nightcore = "NC",
	Flashlight = "FL",
	Autoplay = "AT",
	SpunOut = "SO",
	Relax2 = "AP",
	Perfect = "PF",
	Key4 = "K4",
	Key5 = "K5",
	Key6 = "K6",
	Key7 = "K7",
	Key8 = "K8",
	FadeIn = "FI",
	Random = "RN",
	Cinema = "CN",
	Target = "TP",
	Key9 = "K9",
	Key10 = "KX",
	Key1 = "K1",
	Key3 = "K3",
	Key2 = "K2",
	ScoreV2 = "V2",
	Mirror = "MR"
};

enum AcrToNum {
    NF = 1 << 0,
	EZ = 1 << 1,
	TD = 1 << 2,
	HD = 1 << 3,
	HR = 1 << 4,
	SD = 1 << 5,
	DT = 1 << 6,
	RX = 1 << 7,
	HT = 1 << 8,
	NC = 1 << 9,
	FL = 1 << 10,
	AT = 1 << 11,
	SO = 1 << 12,
	AP = 1 << 13,
	PF = 1 << 14,
	K4 = 1 << 15,
	K5 = 1 << 16,
	K6 = 1 << 17,
	K7 = 1 << 18,
	K8 = 1 << 19,
	FI = 1 << 20,
	RN = 1 << 21,
	CN = 1 << 22,
	TP = 1 << 23,
	K9 = 1 << 24,
	KX = 1 << 25,
	K1 = 1 << 26,
	K3 = 1 << 27,
	K2 = 1 << 28,
	V2 = 1 << 29,
    MR = 1 << 30
}

type Mod = "Nomod" | "NoFail" | "Easy" | "TouchDevice" | "Hidden" | "HardRock" | "SuddenDeath" | "DoubleTime" | "Relax" | "HalfTime" | "Nightcore" | "Flashlight" | "Autoplay" | "SpunOut" | "Relax2" | "Perfect" | "Key4" | "Key5" | "Key6" | "Key7" | "Key8" | "FadeIn" | "Random" | "Cinema" | "Target" | "Key9" | "Key10" | "Key1" | "Key3" | "Key2" | "ScoreV2" | "Mirror";

export default class Mods {
    mods: number[];
	flags: number;
	modsv2: V2Mod[];
	speedMultiplierV2: number = undefined;
	lazer: boolean = false;
    constructor(m: number | string | V2Mod[]) {
		if (typeof m == "string") {
			this.flags = this.fromString(m);
		} else if (typeof m == "number") {
			this.flags = m;
		} else {
			this.modsv2 = m;
			this.flags = this.fromMods(m);
		}
		this.mods = this.parse(this.flags);
    }

    parse(m: number): number[] {
        let r = [];
        for(let i = 0; i < 31; i++) {
            if(m & (1 << i))
                r.push(1 << i);
        }
        return r;
	}

	fromMods(mods: V2Mod[]): number {
		let flags = 0;
		const speedChanging = ["DT", "NC", "HT", "DC"]
		for (let mod of mods) {
			if (AcrToNum[mod.acronym]) {
				flags |= AcrToNum[mod.acronym]
			}

			const idx = speedChanging.indexOf(mod.acronym);
			if (idx != -1) {
				if (mod.settings?.speed_change !== undefined) {
					this.speedMultiplierV2 = mod.settings.speed_change;
				} else {
					if (idx < 2) {
						this.speedMultiplierV2 = 1.5;
					} else {
						this.speedMultiplierV2 = 0.75
					}
				}
			}
			this.lazer = this.lazer || mod.acronym == 'CL';
		}

		return flags;
	}

    fromString(str: string): number {
        let offset = 0;
        let buf = "";
        let m = 0;
        while (offset < str.length) {
			buf += str[offset];
			const currAcr = buf.toUpperCase().slice(-2);
            if (ModsAcronyms[currAcr]) {
				m |=  AcrToNum[currAcr];
                buf = "";
            } else if (currAcr == "CL") {
				this.lazer = true;
				buf = "";
			}
            offset++;
        }
		return m;
    }

    toString(): string {
		if (this.modsv2) {
			let str = this.modsv2.map(m => {
				if (m.settings?.speed_change !== undefined) {
					return m.acronym + 'x' + m.settings.speed_change;
				}
				return m.acronym;
			}).join(" +");
			if(str.length == 0)
				return '';
			else
				return '+' + str;

		}
        let tempMods = this.sum();
        if(this.sum() & ModsBitwise.Nightcore)
            tempMods -= ModsBitwise.DoubleTime;
        if(this.sum() & ModsBitwise.Perfect)
			tempMods -= ModsBitwise.SuddenDeath;
		let p = this.parse(tempMods);
		let str = p.map(mod => ModsAcronyms2[ModsBitwise[mod]]).join("")
		if(str.length == 0)
			return '';
		else
			return '+' + str;
	}
	
	diff() {
		return this.sum() & ModsBitwise.DifficultyChanging;
	}

	isLazer() {
		return this.lazer;
	}

	speed() {
		if (this.speedMultiplierV2 !== undefined) {
			return this.speedMultiplierV2;
		}

		const speed_up = ModsBitwise.DoubleTime | ModsBitwise.Nightcore;
		const speed_down = ModsBitwise.HalfTime;
		if ((this.flags & speed_up) != 0) {
			return 1.5;
		}
		
		if ((this.flags & speed_down) != 0) {
			return 0.75;
		}

		return 1;
	}

    sum(): number {
        return this.mods.length == 0 ? 0 : this.mods.reduce((a,b) => a+b);
	}

    has(mod: Mod): Boolean {
        return this.mods.includes(ModsBitwise[mod]);
    }
}
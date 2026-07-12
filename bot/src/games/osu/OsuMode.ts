export enum OsuMode {
    Standard = 0,
    Taiko = 1,
    Catch = 2,
    Mania = 3,
}

export const OSU_MODE_NAMES: Readonly<Record<OsuMode, string>> = Object.freeze({
    [OsuMode.Standard]: "osu!",
    [OsuMode.Taiko]: "osu!taiko",
    [OsuMode.Catch]: "osu!catch",
    [OsuMode.Mania]: "osu!mania",
});

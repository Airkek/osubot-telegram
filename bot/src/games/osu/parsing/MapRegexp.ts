const rs = [
    /https?:\/\/osu\.ppy\.sh\/b\/(?<ID>\d+)/i,
    /(https?:\/\/)?osu\.ppy\.sh\/beatmaps\/(?<ID>\d+)/i,
    /(https?:\/\/)?osu\.ppy\.sh\/beatmapsets\/(\d+)#(osu|taiko|fruits|mania)+\/(?<ID>\d+)/i,
    /(https?:\/\/)?osu\.gatari\.pw\/b\/(?<ID>\d+)/i,
    /(https?:\/\/)?ripple\.moe\/b\/(?<ID>\d+)/i,
    /(https?:\/\/)?akatsuki\.gg\/b\/(?<ID>\d+)/i,
];

export function getMapIdFromLink(text: string): number {
    for (const regex of rs) {
        if (regex.test(text)) {
            return Number(text.match(regex).groups.ID);
        }
    }

    return 0;
}

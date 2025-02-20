const rs = [
    /https?:\/\/osu\.ppy\.sh\/b\/(?<ID>\d+)/i,
    /(https?:\/\/)?osu\.ppy\.sh\/beatmaps\/(?<ID>\d+)/i,
    /(https?:\/\/)?osu\.ppy\.sh\/beatmapsets\/(\d+)#(osu|taiko|fruits|mania)+\/(?<ID>\d+)/i,
    /(https?:\/\/)?osu\.gatari\.pw\/b\/(?<ID>\d+)/i,
    /(https?:\/\/)?ripple\.moe\/b\/(?<ID>\d+)/i,
    /(https?:\/\/)?akatsuki\.gg\/b\/(?<ID>\d+)/i,
];

export default function(text: string): number {
    for (let i = 0; i < rs.length; i++) {
        if (rs[i].test(text)) {
            return Number(text.match(rs[i]).groups.ID);
        }
    }
    
    return 0;
}
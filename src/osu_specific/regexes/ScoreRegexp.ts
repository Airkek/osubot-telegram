const rs = [/https?:\/\/osu\.ppy\.sh\/scores\/(?<ID>\d+)/i];

export function getScoreIdFromText(text: string): number {
    for (const regex of rs) {
        if (regex.test(text)) {
            return Number(text.match(regex).groups.ID);
        }
    }

    return 0;
}

export interface IScoreCardModel {
    title: string;
    artist: string;
    version: string;
    mapper: string;
    status: string;
    mods: string;

    grade?: string;
    score: string;
    accuracy: string;
    combo: string;

    /** Подписи и значения PP: фактическое, FC, SS — только те, что есть. */
    pp: Array<{ label: string; value: string }>;

    /** 300/100/50/промахи и прочее — уже локализованное. */
    counts: Array<{ label: string; value: string }>;

    /** Звёзды, BPM, длина, AR/CS/OD/HP — готовыми строками. */
    facts: Array<{ label: string; value: string }>;

    date?: string;
    globalRank?: string;
    personalTop?: string;
    failedAt?: string;

    labels: {
        score: string;
        accuracy: string;
        combo: string;
    };

    cover?: string;
}

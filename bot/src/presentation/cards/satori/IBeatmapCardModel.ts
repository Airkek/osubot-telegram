export interface IBeatmapCardModel {
    title: string;
    artist: string;
    mapper: string;
    version: string;
    status: string;
    mods: string;

    /** Звёзды, BPM, длина, AR/CS/OD/HP — готовыми строками. */
    facts: Array<{ label: string; value: string }>;

    /** PP: либо сетка 95/98/99/100%, либо один запрошенный расчёт. */
    pp: Array<{ label: string; value: string }>;

    /** Для PP-карточки: с какими параметрами считали. */
    note?: string;

    cover?: string;
}

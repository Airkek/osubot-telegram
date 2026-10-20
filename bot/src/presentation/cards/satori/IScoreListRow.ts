export interface IScoreListRow {
    place: string;

    /** Главная строка: название карты в топах, ник игрока в лидерборде. */
    primary: string;

    /** Подпись под ней: дифф карты либо страна игрока. */
    secondary: string;

    mods: string;
    grade?: string;
    pp?: string;
    fcPp?: string;
    accuracy: string;
    combo: string;
    cover?: string;
}

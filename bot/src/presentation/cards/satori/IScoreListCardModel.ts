import { IScoreListRow } from "presentation/cards/satori/IScoreListRow";

export interface IScoreListCardModel {
    header: string;
    subheader: string;
    rows: IScoreListRow[];
}

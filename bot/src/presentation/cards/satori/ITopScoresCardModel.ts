import { ITopScoresCardRow } from "presentation/cards/satori/ITopScoresCardRow";

export interface ITopScoresCardModel {
    header: string;
    subheader: string;
    rows: ITopScoresCardRow[];
}

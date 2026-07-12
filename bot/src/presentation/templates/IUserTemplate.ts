import { IGameUser } from "games/users/IGameUser";
import { ILocalizer } from "localization/ILocalizer";

export interface IUserTemplate {
    (localizer: ILocalizer, user: IGameUser, link: string): string;
}

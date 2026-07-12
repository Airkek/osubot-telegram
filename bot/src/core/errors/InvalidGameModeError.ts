import { CustomError } from "core/errors/CustomError";

export class InvalidGameModeError extends CustomError {
    constructor(message = "Invalid game mode") {
        super(message, "invalid-game-mode");
    }
}

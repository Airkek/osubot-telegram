import { CustomError } from "core/errors/CustomError";

export class LeaderboardNotSupportedError extends CustomError {
    constructor(message = "Leaderboard is not supported by this game API") {
        super(message, "leaderboard-not-supported");
    }
}

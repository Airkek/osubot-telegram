import { CustomError } from "core/errors/CustomError";

export class NoRecentScoresError extends CustomError {
    constructor(message = "No recent scores") {
        super(message, "no-recent-scores");
    }
}

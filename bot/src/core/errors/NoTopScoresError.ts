import { CustomError } from "core/errors/CustomError";

export class NoTopScoresError extends CustomError {
    constructor(message = "No top scores") {
        super(message, "no-top-scores");
    }
}

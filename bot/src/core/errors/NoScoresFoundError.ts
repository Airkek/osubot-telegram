import { CustomError } from "core/errors/CustomError";

export class NoScoresFoundError extends CustomError {
    constructor(message = "No scores found") {
        super(message, "no-scores-found");
    }
}

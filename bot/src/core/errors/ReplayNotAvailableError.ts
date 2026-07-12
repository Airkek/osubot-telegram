import { CustomError } from "core/errors/CustomError";

export class ReplayNotAvailableError extends CustomError {
    constructor(message = "Replay is not available") {
        super(message, "replay-not-available");
    }
}

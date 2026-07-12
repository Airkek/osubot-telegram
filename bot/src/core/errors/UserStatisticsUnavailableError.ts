import { CustomError } from "core/errors/CustomError";

export class UserStatisticsUnavailableError extends CustomError {
    constructor(message = "User statistics are unavailable for this mode") {
        super(message, "user-statistics-unavailable");
    }
}

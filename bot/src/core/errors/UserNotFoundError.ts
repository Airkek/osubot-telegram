import { CustomError } from "core/errors/CustomError";

export class UserNotFoundError extends CustomError {
    constructor(message = "User not found") {
        super(message, "user-not-found");
    }
}

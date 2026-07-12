import { CustomError } from "core/errors/CustomError";

export class MessageNotModifiedError extends CustomError {
    constructor() {
        super("Message is not modified");
    }
}

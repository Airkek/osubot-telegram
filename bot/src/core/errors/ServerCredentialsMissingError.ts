import { CustomError } from "core/errors/CustomError";

export class ServerCredentialsMissingError extends CustomError {
    constructor(server: string, message = `${server} API credentials are not configured`) {
        super(message, "server-credentials-missing", { server });
    }
}

import { CustomError } from "core/errors/CustomError";

export class VideoSendFailedError extends CustomError {
    constructor(message = "Failed to send video") {
        super(message, "video-send-failed");
    }
}

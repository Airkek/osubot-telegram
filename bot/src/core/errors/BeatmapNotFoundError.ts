import { CustomError } from "core/errors/CustomError";

export class BeatmapNotFoundError extends CustomError {
    constructor(message = "Beatmap not found") {
        super(message, "beatmap-not-found");
    }
}

import { IVideoMetadata } from "core/IVideoMetadata";
import { MediaFile } from "core/MediaFile";
import { IKeyboard } from "presentation/keyboard/IKeyboard";

export interface ISendOptions {
    keyboard?: IKeyboard;
    photo?: MediaFile;
    video?: IVideoMetadata;
    dont_parse_links?: boolean;
}

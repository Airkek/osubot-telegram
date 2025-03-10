export interface Video {
    url: string;
    width: number;
    heigth: number;
    duration: number;
}

export interface RenderResponse {
    success: boolean;
    video?: Video;
    error?: string;
}

export interface IReplayRenderer {
    render(file: Buffer): Promise<RenderResponse>;
}

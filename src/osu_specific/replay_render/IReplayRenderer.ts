export interface RenderResponse {
    success: boolean;
    video_url?: string;
    error?: string;
}

export interface IReplayRenderer {
    render(file: Buffer): Promise<RenderResponse>;
}

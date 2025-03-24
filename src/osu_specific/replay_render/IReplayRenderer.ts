export interface Video {
    url: string;
    width: number;
    heigth: number;
    duration: number;
}

export interface RenderSettings {
    skin: string;
    video: boolean;
    storyboard: boolean;
    dim: number;
    pp_counter: boolean;
    ur_counter: boolean;
    hit_counter: boolean;
    strain_graph: boolean;
}

export interface RenderResponse {
    success: boolean;
    video?: Video;
    error?: string;
}

export interface IReplayRenderer {
    render(file: Buffer, settings: RenderSettings): Promise<RenderResponse>;
}

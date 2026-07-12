export interface IRankedPlayStatistics {
    poolName: string;
    rating: number;
    rank?: number;
    plays: number;
    wins: number;
    provisional: boolean;
}

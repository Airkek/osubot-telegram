export type BeatmapPerformanceSummary =
    | {
          kind: "accuracy";
          pp98: number;
          pp99: number;
          pp100: number;
      }
    | {
          kind: "mania-score";
          pp: number;
      };

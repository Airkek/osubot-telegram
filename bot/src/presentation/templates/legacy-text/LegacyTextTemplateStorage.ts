import { ITemplateStorage } from "presentation/templates/ITemplateStorage";
import { formatBeatmapInfo } from "presentation/templates/legacy-text/Beatmap";
import { formatLeaderboard } from "presentation/templates/legacy-text/Leaderboard";
import { formatPerformance } from "presentation/templates/legacy-text/PP";
import { formatScoreFull } from "presentation/templates/legacy-text/ScoreFull";
import { formatSearchResults } from "presentation/templates/legacy-text/Search";
import { formatTopScore } from "presentation/templates/legacy-text/TopScore";
import { formatTrack } from "presentation/templates/legacy-text/Track";
import { formatUser } from "presentation/templates/legacy-text/User";

const LegacyTextTemplates: ITemplateStorage = {
    User: formatUser,
    TopScore: formatTopScore,
    ScoreFull: formatScoreFull,
    Beatmap: formatBeatmapInfo,
    PP: formatPerformance,
    Leaderboard: formatLeaderboard,
    Track: formatTrack,
    Search: formatSearchResults,
};

export { LegacyTextTemplates };

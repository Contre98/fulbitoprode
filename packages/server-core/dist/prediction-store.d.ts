import type { MatchPeriod, PredictionsByMatch, PredictionValue } from "./types";
interface PredictionScope {
    userId?: string;
    groupId?: string;
}
export declare function ensurePrediction(period: MatchPeriod, matchId: string, initial?: PredictionValue, scope?: PredictionScope): void;
export declare function setPrediction(period: MatchPeriod, matchId: string, prediction: PredictionValue, scope?: PredictionScope): void;
export declare function getPredictions(period: MatchPeriod, scope?: PredictionScope): PredictionsByMatch;
export declare function clonePredictions(period: MatchPeriod, scope?: PredictionScope): PredictionsByMatch;
export {};

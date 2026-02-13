import type { MatchPeriod, PredictionsByMatch, PredictionValue } from "@/lib/types";

const predictionStore: Record<MatchPeriod, PredictionsByMatch> = {
  fecha14: {},
  fecha15: {}
};

export function ensurePrediction(period: MatchPeriod, matchId: string, initial: PredictionValue = { home: null, away: null }) {
  if (!predictionStore[period][matchId]) {
    predictionStore[period][matchId] = initial;
  }
}

export function setPrediction(period: MatchPeriod, matchId: string, prediction: PredictionValue) {
  predictionStore[period][matchId] = prediction;
}

export function getPredictions(period: MatchPeriod): PredictionsByMatch {
  return predictionStore[period];
}

export function clonePredictions(period: MatchPeriod): PredictionsByMatch {
  const source = predictionStore[period];
  return Object.fromEntries(
    Object.entries(source).map(([matchId, value]) => [matchId, { home: value.home, away: value.away }])
  );
}

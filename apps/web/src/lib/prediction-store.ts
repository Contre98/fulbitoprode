import type { MatchPeriod, PredictionsByMatch, PredictionValue } from "@/lib/types";

interface PredictionScope {
  userId?: string;
  groupId?: string;
}

const predictionStore: Record<MatchPeriod, Record<string, PredictionsByMatch>> = {
  fecha14: {
    public: {}
  },
  fecha15: {
    public: {}
  }
};

function toScopeKey(scope?: PredictionScope) {
  const user = scope?.userId?.trim() || "anon";
  const group = scope?.groupId?.trim() || "default";
  if (user === "anon" && group === "default") {
    return "public";
  }
  return `${user}:${group}`;
}

function getScopeStore(period: MatchPeriod, scope?: PredictionScope) {
  const key = toScopeKey(scope);
  if (!predictionStore[period][key]) {
    predictionStore[period][key] = {};
  }
  return predictionStore[period][key];
}

export function ensurePrediction(
  period: MatchPeriod,
  matchId: string,
  initial: PredictionValue = { home: null, away: null },
  scope?: PredictionScope
) {
  const scopedStore = getScopeStore(period, scope);
  if (!scopedStore[matchId]) {
    scopedStore[matchId] = initial;
  }
}

export function setPrediction(period: MatchPeriod, matchId: string, prediction: PredictionValue, scope?: PredictionScope) {
  const scopedStore = getScopeStore(period, scope);
  scopedStore[matchId] = prediction;
}

export function getPredictions(period: MatchPeriod, scope?: PredictionScope): PredictionsByMatch {
  return getScopeStore(period, scope);
}

export function clonePredictions(period: MatchPeriod, scope?: PredictionScope): PredictionsByMatch {
  const source = getScopeStore(period, scope);
  return Object.fromEntries(
    Object.entries(source).map(([matchId, value]) => [matchId, { home: value.home, away: value.away }])
  );
}

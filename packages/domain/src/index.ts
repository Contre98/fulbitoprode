export type MembershipRole = "owner" | "admin" | "member";
export type CompetitionStage = "apertura" | "clausura" | "general";

export interface User {
  id: string;
  email: string;
  name: string;
  username?: string | null;
  favoriteTeam?: string | null;
}

export interface Membership {
  groupId: string;
  groupName: string;
  leagueId: number;
  leagueName: string;
  season: string;
  competitionKey?: string;
  competitionName?: string;
  competitionStage?: CompetitionStage;
  role: MembershipRole;
  joinedAt: string;
}

export interface SessionPayload {
  user: User;
  memberships: Membership[];
}

export interface Group {
  id: string;
  name: string;
  leagueId: number;
  season: string;
}

export interface Prediction {
  fixtureId: string;
  home: number;
  away: number;
}

export interface Fixture {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  status: "upcoming" | "live" | "final";
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  points: number;
  rank: number;
}

export interface PredictionInputDraft {
  home: string;
  away: string;
}

export interface PredictionInputValue {
  home: number | null;
  away: number | null;
}

export interface MatchScoreValue {
  home: number;
  away: number;
}

export const MAX_PREDICTION_GOALS = 99;
export const SCORE_RULES = {
  exact: 3,
  outcome: 1,
  miss: 0
} as const;

function normalizeGoalValue(raw: string): number | null {
  const value = raw.trim();
  if (value.length === 0) {
    return null;
  }

  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > MAX_PREDICTION_GOALS) {
    return null;
  }

  return parsed;
}

export function normalizePredictionInput(input: PredictionInputDraft): PredictionInputValue {
  return {
    home: normalizeGoalValue(input.home),
    away: normalizeGoalValue(input.away)
  };
}

export function isPredictionInputComplete(input: PredictionInputValue): input is Prediction {
  return input.home !== null && input.away !== null;
}

export function calculatePredictionPoints(prediction: MatchScoreValue, score: MatchScoreValue) {
  if (prediction.home === score.home && prediction.away === score.away) {
    return SCORE_RULES.exact;
  }

  const predictionDiff = Math.sign(prediction.home - prediction.away);
  const scoreDiff = Math.sign(score.home - score.away);
  return predictionDiff === scoreDiff ? SCORE_RULES.outcome : SCORE_RULES.miss;
}

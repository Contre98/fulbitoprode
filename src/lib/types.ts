export type AppTab = "inicio" | "posiciones" | "pronosticos" | "fixture" | "configuracion";

export type MatchStatus = "live" | "upcoming" | "final";
export type PointsTone = "positive" | "warning" | "danger" | "neutral";

export interface TeamRef {
  code: string;
}

export interface MatchScore {
  home: number;
  away: number;
}

export interface MatchMeta {
  label: string;
  venue?: string;
}

export interface MatchPoints {
  value: number;
  tone: PointsTone;
}

export interface MatchCardData {
  id: string;
  status: MatchStatus;
  homeTeam: TeamRef;
  awayTeam: TeamRef;
  score?: MatchScore;
  prediction?: MatchScore;
  meta: MatchMeta;
  points?: MatchPoints;
  progress?: number;
}

export interface PredictionStepperState {
  homeValue: number | null;
  awayValue: number | null;
}

export interface GroupCard {
  id: string;
  title: string;
  subtitle: string;
  rank: string;
  rankDelta?: string;
  points: string;
  primary?: boolean;
}

export interface LeaderboardRow {
  rank: number;
  name: string;
  predictions: number;
  record: string;
  points: number;
  highlight?: boolean;
}

export type LeaderboardMode = "posiciones" | "stats";
export type LeaderboardPeriod = "global" | "fecha14";

export interface LeaderboardPayload {
  groupLabel: string;
  mode: LeaderboardMode;
  period: LeaderboardPeriod;
  periodLabel: string;
  updatedAt: string;
  rows: LeaderboardRow[];
}

export type FixtureScoreTone = "final" | "live" | "upcoming" | "warning";

export interface FixtureMatchRow {
  home: string;
  away: string;
  scoreLabel: string;
  tone: FixtureScoreTone;
}

export interface FixtureDateCard {
  dateLabel: string;
  accent?: "default" | "live";
  rows: FixtureMatchRow[];
}

export type MatchPeriod = "fecha14" | "fecha15";

export interface PredictionValue {
  home: number | null;
  away: number | null;
}

export type PredictionsByMatch = Record<string, PredictionValue>;

export interface PronosticosPayload {
  period: MatchPeriod;
  periodLabel: string;
  matches: MatchCardData[];
  predictions: PredictionsByMatch;
  updatedAt: string;
}

export interface FixturePayload {
  period: MatchPeriod;
  periodLabel: string;
  cards: FixtureDateCard[];
  updatedAt: string;
}

export type AppTab = "inicio" | "posiciones" | "pronosticos" | "fixture" | "configuracion";

export type MatchStatus = "live" | "upcoming" | "final";
export type PointsTone = "positive" | "warning" | "danger" | "neutral";

export interface TeamRef {
  code: string;
  logoUrl?: string;
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
  kickoffAt?: string;
  deadlineAt?: string;
  isLocked?: boolean;
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
  userId?: string;
  name: string;
  predictions: number;
  record: string;
  points: number;
  highlight?: boolean;
  deltaRank?: number;
  streak?: number;
}

export type LeaderboardMode = "posiciones" | "stats";
export type MatchPeriod = string;
export type LeaderboardPeriod = "global" | MatchPeriod;

export interface LeaderboardBestFecha {
  period: MatchPeriod;
  periodLabel: string;
  userId?: string;
  userName: string;
  points: number;
}

export interface LeaderboardWorldBenchmark {
  leagueName: string;
  leaderPoints: number;
  groupTotalPoints: number;
  averageMemberPoints: number;
  ratioVsLeaderPct: number;
}

export interface LeaderboardGroupStats {
  memberCount: number;
  scoredPredictions: number;
  correctPredictions: number;
  exactPredictions: number;
  resultPredictions: number;
  missPredictions: number;
  accuracyPct: number;
  totalPoints: number;
  averageMemberPoints: number;
  bestFecha: LeaderboardBestFecha | null;
  worldBenchmark: LeaderboardWorldBenchmark | null;
}

export interface LeaderboardPayload {
  groupLabel: string;
  mode: LeaderboardMode;
  period: LeaderboardPeriod;
  periodLabel: string;
  updatedAt: string;
  rows: LeaderboardRow[];
  groupStats?: LeaderboardGroupStats | null;
}

export type FixtureScoreTone = "final" | "live" | "upcoming" | "warning";

export interface FixtureMatchRow {
  home: string;
  away: string;
  homeLogoUrl?: string;
  awayLogoUrl?: string;
  scoreLabel: string;
  tone: FixtureScoreTone;
  kickoffAt?: string;
  venue?: string;
  statusDetail?: string;
}

export interface FixtureDateCard {
  dateLabel: string;
  accent?: "default" | "live";
  rows: FixtureMatchRow[];
}

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

export interface HomeSummary {
  pendingPredictions?: number;
  liveMatches?: number;
  myRank?: number;
  myPoints?: number;
}

export interface HomePayload {
  groupCards: GroupCard[];
  liveCards: FixtureDateCard[];
  updatedAt: string;
  summary?: HomeSummary;
}

export interface ProfileStats {
  totalPoints: number;
  accuracyPct: number;
  groups: number;
}

export interface ProfileActivityItem {
  id: string;
  type: "prediction" | "group_join";
  label: string;
  occurredAt: string;
  points?: number;
}

export interface ProfilePayload {
  stats: ProfileStats;
  recentActivity: ProfileActivityItem[];
  updatedAt: string;
}

export interface LeagueOption {
  id: number;
  name: string;
  country?: string;
  season: string;
  competitionKey: string;
  competitionName: string;
  competitionStage?: "apertura" | "clausura" | "general";
  status: "ongoing" | "upcoming";
  startsAt?: string;
  endsAt?: string;
}

export interface LeaguesPayload {
  leagues: LeagueOption[];
  updatedAt: string;
}

export interface FechaOption {
  id: MatchPeriod;
  label: string;
}

export interface FechasPayload {
  leagueId: number;
  season: string;
  fechas: FechaOption[];
  defaultFecha: MatchPeriod;
  updatedAt: string;
}

export interface SelectionOption {
  groupId: string;
  groupName: string;
  role: "owner" | "admin" | "member";
  leagueId: number;
  leagueName: string;
  season: string;
  competitionKey?: string;
  competitionName?: string;
  competitionStage?: "apertura" | "clausura" | "general";
}

export type PredictionSaveStatus = "idle" | "saving" | "error";

export interface GroupInvite {
  code: string;
  token: string;
  expiresAt: string;
}

export interface GroupInvitePayload {
  invite: GroupInvite | null;
  canRefresh: boolean;
  inviteUrl?: string;
}

export interface CreateGroupResponse {
  group: {
    id: string;
    name: string;
    slug: string;
    role: "owner" | "admin" | "member";
    season: string;
    leagueId: number;
    competitionStage: "apertura" | "clausura" | "general";
    competitionName: string;
    competitionKey: string;
  };
  invite: GroupInvite;
}

export interface RefreshInviteResponse {
  ok: true;
  invite: GroupInvite;
}

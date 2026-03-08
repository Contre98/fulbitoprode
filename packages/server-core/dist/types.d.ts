import type { LeaderboardApiGroupStats, LeaderboardApiPayload, LeaderboardApiRow } from "@fulbito/api-contracts";
import type { LeaderboardBestRound, LeaderboardMode, LeaderboardPeriod, LeaderboardWorldBenchmark } from "@fulbito/domain";
export type AppTab = "inicio" | "posiciones" | "pronosticos" | "fixture";
export type MatchStatus = "live" | "upcoming" | "final";
export type PointsTone = "positive" | "warning" | "danger" | "neutral";
export interface TeamRef {
    code: string;
    name?: string;
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
export type LeaderboardRow = LeaderboardApiRow;
export type MatchPeriod = string;
export type LeaderboardBestFecha = LeaderboardBestRound;
export type LeaderboardGroupStats = LeaderboardApiGroupStats;
export type LeaderboardPayload = LeaderboardApiPayload;
export type { LeaderboardMode, LeaderboardPeriod, LeaderboardWorldBenchmark };
export type FixtureScoreTone = "final" | "live" | "upcoming" | "warning";
export interface FixtureMatchRow {
    home: string;
    away: string;
    homeLogoUrl?: string;
    awayLogoUrl?: string;
    score?: MatchScore;
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
    weeklyWinner?: {
        period: string;
        periodLabel: string;
        winnerName: string;
        points: number;
        tied?: boolean;
    } | null;
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
    performance?: {
        exactHitRatePct: number;
        outcomeHitRatePct: number;
        misses: number;
        averagePointsPerRound: number;
        bestRound: {
            period: string;
            periodLabel: string;
            userName: string;
            points: number;
        } | null;
        streak: number;
    } | null;
    achievements?: Array<{
        id: string;
        title: string;
        description: string;
        unlockedAt: string;
    }>;
    rankHistory?: Array<{
        period: string;
        periodLabel: string;
        rank: number;
        points: number;
    }>;
    weeklyWinner?: {
        period: string;
        periodLabel: string;
        winnerName: string;
        points: number;
        tied?: boolean;
    } | null;
    updatedAt: string;
}
export interface NotificationPreferences {
    reminders: boolean;
    results: boolean;
    social: boolean;
}
export interface NotificationItem {
    id: string;
    type: "prediction_lock" | "results_published" | "weekly_winner" | "social";
    title: string;
    body: string;
    createdAt: string;
    read: boolean;
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

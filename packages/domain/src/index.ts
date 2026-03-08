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
  homeLogoUrl?: string;
  awayLogoUrl?: string;
  kickoffAt: string;
  status: "upcoming" | "live" | "final";
  score?: MatchScoreValue | null;
}

export interface PredictionHistoryEntry {
  fixtureId: string;
  status: Fixture["status"];
  kickoffAt: string;
  homeTeam: string;
  awayTeam: string;
  homeLogoUrl?: string;
  awayLogoUrl?: string;
  userPrediction?: MatchScoreValue | null;
  actualResult?: MatchScoreValue | null;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  points: number;
  rank: number;
}

export type LeaderboardMode = "posiciones" | "stats";
export type LeaderboardPeriod = "global" | string;

export interface LeaderboardRecordBreakdown {
  exact: number;
  outcome: number;
  miss: number;
}

export interface LeaderboardStatsRow {
  rank: number;
  userId?: string;
  name: string;
  predictions: number;
  record: string;
  points: number;
  breakdown?: LeaderboardRecordBreakdown;
  highlight?: boolean;
  deltaRank?: number;
  streak?: number;
}

export interface LeaderboardBestRound {
  period: string;
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

export interface LeaderboardMemberStatsSummary {
  memberCount: number;
  scoredPredictions: number;
  correctPredictions: number;
  exactPredictions: number;
  resultPredictions: number;
  missPredictions: number;
  accuracyPct: number;
  totalPoints: number;
  averageMemberPoints: number;
  bestRound: LeaderboardBestRound | null;
  worstRound: LeaderboardBestRound | null;
  worldBenchmark: LeaderboardWorldBenchmark | null;
}

export interface LeaderboardAward {
  id: string;
  title: string;
  winnerUserId?: string;
  winnerName: string;
  subtitle: string;
  metricValue?: number;
}

export interface LeaderboardHistoricalPoint {
  period: string;
  periodLabel: string;
  rank: number;
  points: number;
}

export interface LeaderboardHistoricalSeries {
  userId: string;
  userName: string;
  points: LeaderboardHistoricalPoint[];
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
  performance?: ProfilePerformance | null;
  achievements?: ProfileAchievement[];
  rankHistory?: ProfileRankHistoryPoint[];
  weeklyWinner?: WeeklyWinnerSummary | null;
  updatedAt: string;
}

export interface ProfilePerformance {
  exactHitRatePct: number;
  outcomeHitRatePct: number;
  misses: number;
  averagePointsPerRound: number;
  bestRound: LeaderboardBestRound | null;
  streak: number;
}

export interface ProfileAchievement {
  id: string;
  title: string;
  description: string;
  unlockedAt: string;
}

export interface ProfileRankHistoryPoint {
  period: string;
  periodLabel: string;
  rank: number;
  points: number;
}

export interface WeeklyWinnerSummary {
  period: string;
  periodLabel: string;
  winnerName: string;
  points: number;
  tied?: boolean;
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

export interface FixtureDateGroup<T> {
  dateKey: string;
  dateLabel: string;
  fixtures: T[];
}

export const MAX_PREDICTION_GOALS = 99;
export const SCORE_RULES = {
  exact: 3,
  outcome: 1,
  miss: 0
} as const;
export const FIXTURE_STATUS_ORDER: Record<Fixture["status"], number> = {
  live: 0,
  upcoming: 1,
  final: 2
};

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

export function parseLeaderboardRecord(record: string): LeaderboardRecordBreakdown {
  const [exactRaw, resultRaw, missRaw] = record.split("/");
  return {
    exact: Number.parseInt(exactRaw || "0", 10) || 0,
    outcome: Number.parseInt(resultRaw || "0", 10) || 0,
    miss: Number.parseInt(missRaw || "0", 10) || 0
  };
}

export function formatLeaderboardRecord(record: LeaderboardRecordBreakdown) {
  return `${record.exact}/${record.outcome}/${record.miss}`;
}

function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function fixtureDateKey(kickoffAt: string | Date, options?: { timeZone?: string }) {
  const date = kickoffAt instanceof Date ? kickoffAt : new Date(kickoffAt);
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: options?.timeZone
  }).format(date);
}

export function fixtureDateLabel(
  kickoffAt: string | Date,
  options?: {
    locale?: string;
    timeZone?: string;
  }
) {
  const date = kickoffAt instanceof Date ? kickoffAt : new Date(kickoffAt);
  const locale = options?.locale ?? "es-AR";
  const weekday = capitalize(
    new Intl.DateTimeFormat(locale, {
      weekday: "long",
      timeZone: options?.timeZone
    }).format(date)
  );
  const day = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    timeZone: options?.timeZone
  }).format(date);
  const month = capitalize(
    new Intl.DateTimeFormat(locale, {
      month: "long",
      timeZone: options?.timeZone
    }).format(date)
  );

  return `${weekday}, ${day} de ${month}`;
}

export function compareFixturesByStatusAndKickoff<T extends { status: Fixture["status"]; kickoffAt: string }>(a: T, b: T) {
  const statusDiff = FIXTURE_STATUS_ORDER[a.status] - FIXTURE_STATUS_ORDER[b.status];
  if (statusDiff !== 0) {
    return statusDiff;
  }

  return new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime();
}

export function groupFixturesByDate<T extends { kickoffAt: string }>(
  fixtures: T[],
  options?: {
    locale?: string;
    timeZone?: string;
  }
): FixtureDateGroup<T>[] {
  const grouped = new Map<string, FixtureDateGroup<T>>();

  fixtures.forEach((fixture) => {
    const key = fixtureDateKey(fixture.kickoffAt, { timeZone: options?.timeZone });
    const existing = grouped.get(key);
    if (existing) {
      existing.fixtures.push(fixture);
      return;
    }

    grouped.set(key, {
      dateKey: key,
      dateLabel: fixtureDateLabel(fixture.kickoffAt, {
        locale: options?.locale,
        timeZone: options?.timeZone
      }),
      fixtures: [fixture]
    });
  });

  return [...grouped.values()].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

function extractBackendMessage(rawMessage: string) {
  let message = rawMessage.trim();
  const pbPrefix = message.match(/^PocketBase\s+\d{3}:\s*([\s\S]+)$/i);
  if (pbPrefix) {
    message = pbPrefix[1].trim();
  }

  if (message.startsWith("{") || message.startsWith("[")) {
    try {
      const parsed = JSON.parse(message) as {
        message?: unknown;
        data?: Record<string, { message?: unknown }>;
      };

      if (typeof parsed.message === "string" && parsed.message.trim().length > 0) {
        return parsed.message.trim();
      }

      if (parsed.data && typeof parsed.data === "object") {
        const firstDataMessage = Object.values(parsed.data).find(
          (entry) => entry && typeof entry.message === "string" && entry.message.trim().length > 0
        );
        if (firstDataMessage && typeof firstDataMessage.message === "string") {
          return firstDataMessage.message.trim();
        }
      }
    } catch {
      // Keep original message when response payload is not JSON.
    }
  }

  return message;
}

export function translateBackendErrorMessage(rawMessage: string) {
  const extracted = extractBackendMessage(rawMessage);
  const normalized = extracted.toLowerCase();

  if (!normalized) {
    return extracted;
  }

  if (normalized.includes("only admins can manage this resource")) {
    return "Solo admins u owners pueden realizar esta acción.";
  }
  if (normalized.includes("create failed")) {
    return "No se pudo crear el grupo. Reintentá.";
  }
  if (normalized.includes("invalid invite")) {
    return "No se pudo unir al grupo. Revisá el código e intentá otra vez.";
  }
  if (normalized.includes("something went wrong while processing your request")) {
    return "No se pudo completar la operación en este momento. Intentá de nuevo.";
  }
  if (normalized.includes("invite not found")) {
    return "La invitación no existe o ya no es válida.";
  }
  if (normalized.includes("invite expired")) {
    return "La invitación está vencida.";
  }
  if (normalized.includes("invite reached max uses")) {
    return "La invitación alcanzó el límite de usos.";
  }
  if (normalized.includes("invalid credentials") || normalized.includes("failed to authenticate")) {
    return "Email o contraseña incorrectos.";
  }
  if (normalized.includes("name is required")) {
    return "Ingresá un nombre válido.";
  }
  if (normalized.includes("name is too long")) {
    return "El nombre no puede superar 120 caracteres.";
  }
  if (normalized.includes("username is required")) {
    return "Ingresá un username válido.";
  }
  if (normalized.includes("username is too long")) {
    return "El username no puede superar 40 caracteres.";
  }
  if (normalized.includes("username can only include letters, numbers, dot, underscore and dash")) {
    return "El username solo puede incluir letras, números, punto, guion bajo y guion.";
  }
  if (normalized.includes("email is required")) {
    return "Ingresá un email válido.";
  }
  if (normalized.includes("email is too long")) {
    return "El email no puede superar 190 caracteres.";
  }
  if (normalized.includes("email is invalid")) {
    return "Ingresá un email válido.";
  }
  if (normalized.includes("favorite team is too long")) {
    return "El equipo favorito no puede superar 120 caracteres.";
  }
  if (normalized.includes("groupid is required")) {
    return "Falta identificar el grupo para completar la acción.";
  }
  if (normalized.includes("codeortoken is required")) {
    return "Ingresá un código o token de invitación.";
  }
  if (normalized.includes("invalid payload")) {
    return "Los datos enviados no son válidos.";
  }
  if (normalized.includes("unauthorized") || normalized.includes("forbidden") || normalized.includes("permission denied")) {
    return "No tenés permisos para realizar esta acción.";
  }
  if (normalized.includes("too many request") || normalized.includes("too many attempt")) {
    return "Demasiados intentos. Esperá un momento y probá de nuevo.";
  }
  if (normalized.includes("network request failed")) {
    return "No pudimos conectarnos con el servidor. Revisá tu conexión.";
  }
  if (normalized.includes("not found") || normalized.includes("resource wasn")) {
    return "No encontramos el recurso solicitado.";
  }
  if (normalized.startsWith("http 5")) {
    return "El servidor no pudo completar la solicitud. Intentá nuevamente en unos minutos.";
  }
  if (normalized.startsWith("http 4")) {
    return "No se pudo procesar la solicitud. Revisá los datos e intentá nuevamente.";
  }

  return extracted;
}

export function translateBackendError(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return translateBackendErrorMessage(error.message);
  }
  return translateBackendErrorMessage(fallbackMessage);
}

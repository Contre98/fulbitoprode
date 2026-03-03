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

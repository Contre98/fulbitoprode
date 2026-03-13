import type {
  FixtureApiMatch,
  GroupDeletePayload,
  GroupInvitePayload,
  GroupInviteRefreshPayload,
  GroupLeavePayload,
  GroupMemberUpdatePayload,
  GroupMembersPayload,
  LeaderboardApiPayload,
  FixtureApiPayload,
  FixtureRepository,
  GroupsRepository,
  LeaderboardRepository,
  NotificationsRepository,
  ProfileRepository,
  PredictionsRepository
} from "@fulbito/api-contracts";
import type {
  Fixture,
  Group,
  GroupSearchResult,
  LeaderboardEntry,
  MatchScoreValue,
  Membership,
  NotificationItem,
  NotificationPreferences,
  Prediction,
  ProfilePayload,
  User,
  WeeklyWinnerSummary
} from "@fulbito/domain";
import { translateBackendErrorMessage } from "@fulbito/domain";
import { getRequiredApiBaseUrl } from "@/lib/apiBaseUrl";
import { clearAuthTokens, getAccessToken, getRefreshToken, setAuthTokens } from "@/repositories/httpAuthTokens";

function getApiBaseUrl() {
  return getRequiredApiBaseUrl();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

async function parseErrorMessage(response: Response, path: string) {
  try {
    const payload = (await response.json()) as unknown;
    if (isRecord(payload) && typeof payload.error === "string" && payload.error.trim().length > 0) {
      return translateBackendErrorMessage(payload.error.trim());
    }
  } catch {
    // Ignore malformed payloads and fall back to generic status errors.
  }
  return translateBackendErrorMessage(`HTTP ${response.status} for ${path}`);
}

class ApiHttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function performFetch(path: string, init?: RequestInit) {
  const baseUrl = getApiBaseUrl();
  const accessToken = await getAccessToken();

  const headers = new Headers(init?.headers || {});
  if (!headers.has("content-type") && init?.body) {
    headers.set("content-type", "application/json");
  }
  if (accessToken) {
    headers.set("authorization", `Bearer ${accessToken}`);
  }

  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers
  });
}

async function tryRefreshTokens() {
  const baseUrl = getApiBaseUrl();
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  const response = await fetch(`${baseUrl}/api/auth/refresh`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken })
  });

  if (!response.ok) {
    await clearAuthTokens();
    return false;
  }

  const payload = (await response.json()) as unknown;
  if (
    isRecord(payload) &&
    typeof payload.accessToken === "string" &&
    payload.accessToken.trim().length > 0
  ) {
    await setAuthTokens({
      accessToken: payload.accessToken,
      refreshToken:
        typeof payload.refreshToken === "string" && payload.refreshToken.trim().length > 0
          ? payload.refreshToken
          : refreshToken
    });
    return true;
  }

  await clearAuthTokens();
  return false;
}

async function requestJson<T>(path: string, init?: RequestInit, allowRefresh = true): Promise<T> {
  const response = await performFetch(path, init);

  if (response.status === 401 && allowRefresh && path !== "/api/auth/refresh") {
    const refreshed = await tryRefreshTokens();
    if (refreshed) {
      return requestJson<T>(path, init, false);
    }
  }

  if (!response.ok) {
    throw new ApiHttpError(response.status, await parseErrorMessage(response, path));
  }

  return (await response.json()) as T;
}

interface PronosticosHttpPayload {
  matches: Array<{
    id: string;
    status: Fixture["status"];
    kickoffAt?: string;
    score?: MatchScoreValue;
    homeTeam: { code: string; name?: string; logoUrl?: string };
    awayTeam: { code: string; name?: string; logoUrl?: string };
  }>;
  predictions: Record<string, { home: number | null; away: number | null }>;
}

function normalizeFixtureStatus(value: unknown): Fixture["status"] | null {
  if (isRecord(value)) {
    const nestedStatus = readString(value.short) || readString(value.long) || readString(value.label);
    if (nestedStatus) {
      return normalizeFixtureStatus(nestedStatus);
    }
    return null;
  }

  if (value === "upcoming" || value === "live" || value === "final" || value === "postponed") {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (["upcoming", "scheduled", "pending", "not_started", "ns"].includes(normalized)) {
    return "upcoming";
  }
  if (["live", "inplay", "in_play"].includes(normalized)) {
    return "live";
  }
  if (["final", "finished", "ft", "ended", "completed"].includes(normalized)) {
    return "final";
  }
  if (["postponed", "pst", "susp", "canc", "abd", "suspended", "cancelled"].includes(normalized)) {
    return "postponed";
  }

  return null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeFixtureScore(rawScore: unknown): MatchScoreValue | null {
  if (!isRecord(rawScore)) {
    return null;
  }

  const home = rawScore.home;
  const away = rawScore.away;
  if (!isFiniteNumber(home) || !isFiniteNumber(away)) {
    return null;
  }

  return {
    home,
    away
  };
}

function teamCodeFromName(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) {
    return "---";
  }
  if (words.length === 1) {
    return words[0].slice(0, 3).toUpperCase();
  }
  return words
    .slice(0, 3)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase();
}

function fallbackFixtureIdFromCardRow(input: { home: string; away: string; kickoffAt?: string; cardDateLabel: string; rowIndex: number }) {
  const seed = `${input.kickoffAt || input.cardDateLabel}:${input.home}:${input.away}:${input.rowIndex}`;
  return `fixture-${seed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
}

function statusFromCardTone(tone: unknown): Fixture["status"] {
  if (tone === "final") return "final";
  if (tone === "live") return "live";
  if (tone === "postponed") return "postponed";
  return "upcoming";
}

function scoreFromCardScoreLabel(scoreLabel: unknown): MatchScoreValue | null {
  const label = readString(scoreLabel);
  if (!label) {
    return null;
  }

  const match = label.match(/(\d+)\s*-\s*(\d+)/);
  if (!match) {
    return null;
  }

  const home = Number(match[1]);
  const away = Number(match[2]);
  if (!Number.isFinite(home) || !Number.isFinite(away)) {
    return null;
  }

  return { home, away };
}

function normalizeMatchesFromCards(payload: Record<string, unknown>): FixtureApiMatch[] {
  if (!Array.isArray(payload.cards)) {
    return [];
  }

  const matches: FixtureApiMatch[] = [];
  payload.cards.forEach((cardEntry) => {
    if (!isRecord(cardEntry) || !Array.isArray(cardEntry.rows)) {
      return;
    }
    const cardDateLabel = readString(cardEntry.dateLabel) ?? "";
    cardEntry.rows.forEach((rowEntry, rowIndex) => {
      if (!isRecord(rowEntry)) {
        return;
      }
      const home = readString(rowEntry.home);
      const away = readString(rowEntry.away);
      if (!home || !away) {
        return;
      }

      const kickoffAt = readString(rowEntry.kickoffAt) ?? undefined;
      const rowScore = normalizeFixtureScore(rowEntry.score) ?? scoreFromCardScoreLabel(rowEntry.scoreLabel) ?? undefined;
      const rowId = readString(rowEntry.id);
      matches.push({
        id: rowId || fallbackFixtureIdFromCardRow({ home, away, kickoffAt, cardDateLabel, rowIndex }),
        status: statusFromCardTone(rowEntry.tone),
        kickoffAt,
        homeTeam: {
          code: teamCodeFromName(home),
          name: home,
          logoUrl: readString(rowEntry.homeLogoUrl) ?? undefined
        },
        awayTeam: {
          code: teamCodeFromName(away),
          name: away,
          logoUrl: readString(rowEntry.awayLogoUrl) ?? undefined
        },
        score: rowScore
      });
    });
  });

  return matches;
}

function normalizeFixtureMatch(match: FixtureApiMatch): Fixture {
  const homeTeam = isRecord(match.homeTeam) ? match.homeTeam : null;
  const awayTeam = isRecord(match.awayTeam) ? match.awayTeam : null;
  if (!homeTeam || !awayTeam) {
    throw new Error("Malformed fixture payload: missing team data");
  }

  const homeCode = typeof homeTeam.code === "string" ? homeTeam.code.trim() : "";
  const awayCode = typeof awayTeam.code === "string" ? awayTeam.code.trim() : "";
  const homeName = typeof homeTeam.name === "string" && homeTeam.name.trim().length > 0 ? homeTeam.name.trim() : homeCode || "Local";
  const awayName = typeof awayTeam.name === "string" && awayTeam.name.trim().length > 0 ? awayTeam.name.trim() : awayCode || "Visitante";

  const kickoffAt = typeof match.kickoffAt === "string" ? match.kickoffAt : "";
  const kickoffMs = new Date(kickoffAt).getTime();
  if (!Number.isFinite(kickoffMs)) {
    console.error("[fixture] missing or invalid kickoffAt in /api/fixture payload", {
      fixtureId: match.id,
      kickoffAt: match.kickoffAt
    });
    throw new Error(`Malformed fixture payload: missing kickoffAt for fixture ${match.id}`);
  }
  const score = normalizeFixtureScore(match.score);

  const newKickoffAt = typeof match.newKickoffAt === "string" && match.newKickoffAt.trim().length > 0 ? match.newKickoffAt : undefined;

  return {
    id: match.id,
    homeTeam: homeName,
    awayTeam: awayName,
    homeLogoUrl: typeof homeTeam.logoUrl === "string" && homeTeam.logoUrl.trim().length > 0 ? homeTeam.logoUrl : undefined,
    awayLogoUrl: typeof awayTeam.logoUrl === "string" && awayTeam.logoUrl.trim().length > 0 ? awayTeam.logoUrl : undefined,
    kickoffAt,
    status: match.status,
    score: match.status === "upcoming" || match.status === "postponed" ? null : score,
    newKickoffAt
  };
}

function hasUpcomingOrLiveFixture(rows: Fixture[]) {
  return rows.some((row) => row.status === "upcoming" || row.status === "live");
}

function isLegacyFallbackPeriod(period: string) {
  return /^\d{4}-\d{2}$/.test(period.trim());
}

function mergeUniqueFixtures(primary: Fixture[], supplemental: Fixture[]) {
  const byId = new Map<string, Fixture>();
  primary.forEach((row) => {
    byId.set(row.id, row);
  });
  supplemental.forEach((row) => {
    if (!byId.has(row.id)) {
      byId.set(row.id, row);
    }
  });
  return [...byId.values()];
}

function normalizeFixturePayload(payload: unknown): FixtureApiPayload {
  if (!isRecord(payload)) {
    throw new Error("Malformed fixture payload");
  }

  if (!Array.isArray(payload.matches)) {
    const hasCardRows =
      Array.isArray(payload.cards) &&
      payload.cards.some((cardEntry) => isRecord(cardEntry) && Array.isArray(cardEntry.rows) && cardEntry.rows.length > 0);
    if (!hasCardRows) {
      throw new Error("Malformed fixture payload: missing matches");
    }
  }

  const rawMatches = Array.isArray(payload.matches) ? payload.matches : normalizeMatchesFromCards(payload);
  const matches = rawMatches as unknown[];
  if (!Array.isArray(rawMatches)) {
    throw new Error("Malformed fixture payload");
  }
  if (!Array.isArray(payload.matches) && rawMatches.length > 0) {
    console.warn("[fixture] /api/fixture payload missing matches, using cards compatibility mapping");
  }
  const normalizedMatches: FixtureApiMatch[] = [];
  matches.forEach((entry) => {
    if (!isRecord(entry)) {
      return;
    }

    if (typeof entry.id !== "string" || entry.id.trim().length === 0) {
      return;
    }

    const status = normalizeFixtureStatus(entry.status);
    if (!status) {
      return;
    }

    if (!isRecord(entry.homeTeam) || !isRecord(entry.awayTeam)) {
      return;
    }

    normalizedMatches.push({
      id: entry.id,
      status,
      kickoffAt: typeof entry.kickoffAt === "string" ? entry.kickoffAt : undefined,
      homeTeam: {
        code: typeof entry.homeTeam.code === "string" ? entry.homeTeam.code : "",
        name: typeof entry.homeTeam.name === "string" ? entry.homeTeam.name : undefined,
        logoUrl: typeof entry.homeTeam.logoUrl === "string" ? entry.homeTeam.logoUrl : undefined
      },
      awayTeam: {
        code: typeof entry.awayTeam.code === "string" ? entry.awayTeam.code : "",
        name: typeof entry.awayTeam.name === "string" ? entry.awayTeam.name : undefined,
        logoUrl: typeof entry.awayTeam.logoUrl === "string" ? entry.awayTeam.logoUrl : undefined
      },
      score: normalizeFixtureScore(entry.score) ?? undefined
    });
  });

  if (matches.length > 0 && normalizedMatches.length === 0) {
    throw new Error("Malformed fixture payload: no valid matches");
  }

  return {
    period: typeof payload.period === "string" ? payload.period : "",
    periodLabel: typeof payload.periodLabel === "string" ? payload.periodLabel : "",
    cards: Array.isArray(payload.cards) ? (payload.cards as FixtureApiPayload["cards"]) : [],
    matches: normalizedMatches,
    updatedAt: typeof payload.updatedAt === "string" ? payload.updatedAt : new Date().toISOString()
  };
}

interface GroupsHttpPayload {
  groups?: Array<{
    id: string;
    name: string;
    leagueId: number;
    season: string;
  }>;
  memberships?: Array<{
    groupId: string;
    groupName: string;
    leagueId: number;
    leagueName: string;
    season: string;
    role: Membership["role"];
    joinedAt: string;
    competitionKey?: string;
    competitionName?: string;
    competitionStage?: Membership["competitionStage"];
  }>;
}

interface GroupMutationResponse {
  group: {
    id: string;
    name: string;
    season: string;
    leagueId: number;
  };
}

export const httpPredictionsRepository: PredictionsRepository = {
  async listPredictions(input) {
    const payload = await requestJson<PronosticosHttpPayload>(
      `/api/pronosticos?period=${encodeURIComponent(input.fecha)}&groupId=${encodeURIComponent(input.groupId)}`
    );

    const rows: Prediction[] = [];
    Object.entries(payload.predictions).forEach(([fixtureId, prediction]) => {
      if (prediction.home === null || prediction.away === null) {
        return;
      }
      rows.push({
        fixtureId,
        home: prediction.home,
        away: prediction.away
      });
    });

    return rows;
  },
  async savePrediction(input) {
    await requestJson<{ ok: boolean }>("/api/pronosticos", {
      method: "POST",
      body: JSON.stringify({
        period: input.fecha,
        groupId: input.groupId,
        matchId: input.prediction.fixtureId,
        home: input.prediction.home,
        away: input.prediction.away
      })
    });
  }
};

export const httpFixtureRepository: FixtureRepository = {
  async listFixture(input) {
    const periodQuery = `period=${encodeURIComponent(input.fecha)}&groupId=${encodeURIComponent(input.groupId)}`;
    const defaultPeriodQuery = `groupId=${encodeURIComponent(input.groupId)}`;

    const fetchWithQuery = async (query: string) => {
      const payload = normalizeFixturePayload(await requestJson<unknown>(`/api/fixture?${query}`));
      return payload.matches.map(normalizeFixtureMatch);
    };

    const rows = await fetchWithQuery(periodQuery);

    if (!isLegacyFallbackPeriod(input.fecha)) {
      return rows;
    }

    if (rows.length > 0 && hasUpcomingOrLiveFixture(rows)) {
      return rows;
    }

    try {
      const fallbackRows = await fetchWithQuery(defaultPeriodQuery);
      if (rows.length === 0) {
        return fallbackRows;
      }

      const upcomingOrLiveSupplement = fallbackRows.filter((row) => row.status === "upcoming" || row.status === "live");
      if (upcomingOrLiveSupplement.length > 0) {
        return mergeUniqueFixtures(rows, upcomingOrLiveSupplement);
      }
    } catch {
      // Keep primary rows when fallback fetch fails.
    }

    return rows;
  }
};

export const httpLeaderboardRepository: LeaderboardRepository = {
  async getLeaderboardPayload(input) {
    const mode = input.mode === "stats" ? "stats" : "posiciones";
    return requestJson<LeaderboardApiPayload>(
      `/api/leaderboard?mode=${mode}&period=${encodeURIComponent(input.fecha)}&groupId=${encodeURIComponent(input.groupId)}`
    );
  },
  async getLeaderboard(input) {
    const payload = await httpLeaderboardRepository.getLeaderboardPayload({
      ...input,
      mode: "posiciones"
    });

    return payload.rows.map<LeaderboardEntry>((row) => ({
      userId: row.userId ?? `row-${row.rank}-${row.name}`,
      displayName: row.name,
      points: row.points,
      rank: row.rank
    }));
  }
};

export const httpProfileRepository: ProfileRepository = {
  async getProfile() {
    return requestJson<ProfilePayload>("/api/profile");
  },
  async updateProfile(input) {
    const payload = await requestJson<{ ok: boolean; user: User }>("/api/auth/me", {
      method: "PATCH",
      body: JSON.stringify(input)
    });
    return payload.user;
  }
};

export const httpGroupsRepository: GroupsRepository = {
  async listGroups() {
    const payload = await requestJson<GroupsHttpPayload>("/api/groups");
    return (payload.groups ?? []).map<Group>((group) => ({
      id: group.id,
      name: group.name,
      leagueId: group.leagueId,
      season: group.season
    }));
  },
  async listMemberships() {
    const payload = await requestJson<GroupsHttpPayload>("/api/groups");
    return (payload.memberships ?? []).map<Membership>((membership) => ({
      groupId: membership.groupId,
      groupName: membership.groupName,
      leagueId: membership.leagueId,
      leagueName: membership.leagueName,
      season: membership.season,
      role: membership.role,
      joinedAt: membership.joinedAt,
      competitionKey: membership.competitionKey,
      competitionName: membership.competitionName,
      competitionStage: membership.competitionStage
    }));
  },
  async searchGroups(input) {
    const params = new URLSearchParams();
    if (input.query) params.set("q", input.query);
    if (typeof input.leagueId === "number") params.set("leagueId", String(input.leagueId));
    const qs = params.toString();
    const payload = await requestJson<{ groups: GroupSearchResult[] }>(`/api/groups/search${qs ? `?${qs}` : ""}`);
    return payload.groups ?? [];
  },
  async createGroup(input) {
    const payload = await requestJson<GroupMutationResponse>("/api/groups", {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        season: input.season,
        leagueId: input.leagueId,
        competitionStage: input.competitionStage,
        competitionName: input.competitionName,
        competitionKey: input.competitionKey,
        visibility: input.visibility,
        startingFecha: input.startingFecha
      })
    });
    return {
      id: payload.group.id,
      name: payload.group.name,
      season: payload.group.season,
      leagueId: payload.group.leagueId
    };
  },
  async joinGroup(input) {
    const payload = await requestJson<GroupMutationResponse>("/api/groups/join", {
      method: "POST",
      body: JSON.stringify({
        codeOrToken: input.codeOrToken
      })
    });
    return {
      id: payload.group.id,
      name: payload.group.name,
      season: payload.group.season,
      leagueId: payload.group.leagueId
    };
  },
  async updateGroupName(input) {
    return requestJson<{ ok: true; group: { id: string; name: string } }>(`/api/groups/${encodeURIComponent(input.groupId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: input.name
      })
    });
  },
  async listMembers(input) {
    return requestJson<GroupMembersPayload>(`/api/groups/${encodeURIComponent(input.groupId)}/members`);
  },
  async updateMemberRole(input) {
    return requestJson<GroupMemberUpdatePayload>(`/api/groups/${encodeURIComponent(input.groupId)}/members`, {
      method: "PATCH",
      body: JSON.stringify({
        userId: input.userId,
        role: input.role
      })
    });
  },
  async removeMember(input) {
    return requestJson<{ ok: true }>(`/api/groups/${encodeURIComponent(input.groupId)}/members`, {
      method: "DELETE",
      body: JSON.stringify({
        userId: input.userId
      })
    });
  },
  async leaveGroup(input) {
    return requestJson<GroupLeavePayload>("/api/groups/leave", {
      method: "POST",
      body: JSON.stringify({
        groupId: input.groupId
      })
    });
  },
  async deleteGroup(input) {
    return requestJson<GroupDeletePayload>(`/api/groups/${encodeURIComponent(input.groupId)}`, {
      method: "DELETE"
    });
  },
  async getInvite(input) {
    return requestJson<GroupInvitePayload>(`/api/groups/${encodeURIComponent(input.groupId)}/invite`);
  },
  async refreshInvite(input) {
    return requestJson<GroupInviteRefreshPayload>(`/api/groups/${encodeURIComponent(input.groupId)}/invite/refresh`, {
      method: "POST"
    });
  }
};

export const httpNotificationsRepository: NotificationsRepository = {
  async getPreferences() {
    return requestJson<NotificationPreferences>("/api/notifications/preferences");
  },
  async updatePreferences(input) {
    return requestJson<NotificationPreferences>("/api/notifications/preferences", {
      method: "PATCH",
      body: JSON.stringify(input)
    });
  },
  async listInbox() {
    const payload = await requestJson<{
      items: NotificationItem[];
      unreadCount: number;
      weeklyWinner?: WeeklyWinnerSummary | null;
    }>("/api/notifications/inbox");
    return {
      items: payload.items ?? [],
      unreadCount: payload.unreadCount ?? 0,
      weeklyWinner: payload.weeklyWinner ?? null
    };
  },
  async markAllRead() {
    return requestJson<{ ok: true }>("/api/notifications/inbox", {
      method: "POST"
    });
  },
  async registerDeviceToken(input) {
    return requestJson<{ ok: true }>("/api/notifications/device-token", {
      method: "POST",
      body: JSON.stringify(input)
    });
  }
};

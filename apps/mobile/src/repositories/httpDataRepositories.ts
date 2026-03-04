import type {
  FixtureRepository,
  GroupsRepository,
  LeaderboardRepository,
  PredictionsRepository
} from "@fulbito/api-contracts";
import type { Fixture, Group, LeaderboardEntry, Membership, Prediction } from "@fulbito/domain";

function getApiBaseUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  const fromTestGlobal =
    typeof globalThis === "object" &&
    globalThis &&
    "__FULBITO_TEST_API_BASE_URL__" in globalThis &&
    typeof (globalThis as { __FULBITO_TEST_API_BASE_URL__?: unknown }).__FULBITO_TEST_API_BASE_URL__ === "string"
      ? (globalThis as { __FULBITO_TEST_API_BASE_URL__?: string }).__FULBITO_TEST_API_BASE_URL__?.trim()
      : undefined;
  const raw = fromEnv || fromTestGlobal;
  if (!raw) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL is not configured.");
  }
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${path}`);
  }

  return (await response.json()) as T;
}

interface PronosticosHttpPayload {
  matches: Array<{
    id: string;
    status: Fixture["status"];
    kickoffAt?: string;
    homeTeam: { code: string };
    awayTeam: { code: string };
  }>;
  predictions: Record<string, { home: number | null; away: number | null }>;
}

interface LeaderboardHttpPayload {
  rows: Array<{
    rank: number;
    userId?: string;
    name: string;
    points: number;
  }>;
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
    const payload = await requestJson<PronosticosHttpPayload>(
      `/api/pronosticos?period=${encodeURIComponent(input.fecha)}&groupId=${encodeURIComponent(input.groupId)}`
    );

    return payload.matches.map<Fixture>((match) => ({
      id: match.id,
      homeTeam: match.homeTeam.code,
      awayTeam: match.awayTeam.code,
      kickoffAt: match.kickoffAt ?? new Date().toISOString(),
      status: match.status
    }));
  }
};

export const httpLeaderboardRepository: LeaderboardRepository = {
  async getLeaderboard(input) {
    const payload = await requestJson<LeaderboardHttpPayload>(
      `/api/leaderboard?mode=posiciones&period=${encodeURIComponent(input.fecha)}&groupId=${encodeURIComponent(input.groupId)}`
    );

    return payload.rows.map<LeaderboardEntry>((row) => ({
      userId: row.userId ?? `row-${row.rank}-${row.name}`,
      displayName: row.name,
      points: row.points,
      rank: row.rank
    }));
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
  async createGroup(input) {
    const payload = await requestJson<GroupMutationResponse>("/api/groups", {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        season: input.season,
        leagueId: input.leagueId,
        competitionStage: input.competitionStage,
        competitionName: input.competitionName,
        competitionKey: input.competitionKey
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
  }
};

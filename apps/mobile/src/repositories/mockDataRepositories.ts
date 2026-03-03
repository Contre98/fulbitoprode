import type {
  FixtureRepository,
  GroupsRepository,
  LeaderboardRepository,
  PredictionsRepository
} from "@fulbito/api-contracts";

export const mockGroupsRepository: GroupsRepository = {
  async listGroups() {
    return [
      {
        id: "grupo-1",
        name: "Grupo Amigos",
        leagueId: 128,
        season: "2026"
      }
    ];
  },
  async listMemberships() {
    return [
      {
        groupId: "grupo-1",
        groupName: "Grupo Amigos",
        leagueId: 128,
        leagueName: "Liga Profesional",
        season: "2026",
        role: "owner",
        joinedAt: new Date().toISOString(),
        competitionKey: "argentina-128",
        competitionName: "Liga Profesional",
        competitionStage: "apertura"
      }
    ];
  }
};

const predictionsByKey = new Map<string, { fixtureId: string; home: number; away: number }[]>();

export const mockPredictionsRepository: PredictionsRepository = {
  async listPredictions(input) {
    const key = `${input.groupId}:${input.fecha}`;
    return predictionsByKey.get(key) ?? [];
  },
  async savePrediction(input) {
    const key = `${input.groupId}:${input.fecha}`;
    const rows = predictionsByKey.get(key) ?? [];
    const filtered = rows.filter((row) => row.fixtureId !== input.prediction.fixtureId);
    predictionsByKey.set(key, [...filtered, input.prediction]);
  }
};

export const mockFixtureRepository: FixtureRepository = {
  async listFixture() {
    return [
      {
        id: "fx-1",
        homeTeam: "River Plate",
        awayTeam: "Boca Juniors",
        kickoffAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        status: "upcoming"
      }
    ];
  }
};

export const mockLeaderboardRepository: LeaderboardRepository = {
  async getLeaderboard() {
    return [
      {
        userId: "user-1",
        displayName: "Usuario Fulbito",
        points: 18,
        rank: 1
      }
    ];
  }
};

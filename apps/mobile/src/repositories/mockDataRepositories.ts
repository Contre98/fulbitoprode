import type {
  FixtureRepository,
  GroupsRepository,
  LeaderboardRepository,
  PredictionsRepository
} from "@fulbito/api-contracts";
import { createMockGroup, joinMockGroup, listMockGroups, listMockMemberships } from "@/repositories/mockGroupStore";

export const mockGroupsRepository: GroupsRepository = {
  async listGroups() {
    return listMockGroups();
  },
  async listMemberships() {
    return listMockMemberships();
  },
  async createGroup(input) {
    return createMockGroup(input);
  },
  async joinGroup(input) {
    return joinMockGroup(input);
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
    const now = Date.now();
    const finalsBase = now - 1000 * 60 * 60 * 48;
    return [
      {
        id: "fx-upcoming-arg-lan",
        homeTeam: "Argentinos Juniors",
        awayTeam: "Lanús",
        kickoffAt: new Date(now + 1000 * 60 * 60 * 24 * 2).toISOString(),
        status: "upcoming"
      },
      {
        id: "fx-final-1-1-def-bel",
        homeTeam: "Defensa Y Justicia",
        awayTeam: "Belgrano Cordoba",
        kickoffAt: new Date(finalsBase).toISOString(),
        status: "final"
      },
      {
        id: "fx-final-1-0-est-sar",
        homeTeam: "Estudiantes L.P.",
        awayTeam: "Sarmiento Junin",
        kickoffAt: new Date(finalsBase + 1000 * 60 * 45).toISOString(),
        status: "final"
      },
      {
        id: "fx-final-0-0-boc-rac",
        homeTeam: "Boca Juniors",
        awayTeam: "Racing Club",
        kickoffAt: new Date(finalsBase + 1000 * 60 * 90).toISOString(),
        status: "final"
      },
      {
        id: "fx-final-2-1-ins-atl",
        homeTeam: "Instituto Cordoba",
        awayTeam: "Atletico Tucuman",
        kickoffAt: new Date(finalsBase + 1000 * 60 * 135).toISOString(),
        status: "final"
      },
      {
        id: "fx-final-0-1-ros-tal",
        homeTeam: "Rosario Central",
        awayTeam: "Talleres Cordoba",
        kickoffAt: new Date(finalsBase + 1000 * 60 * 180).toISOString(),
        status: "final"
      },
      {
        id: "fx-final-0-0-gim-gimj",
        homeTeam: "Gimnasia M",
        awayTeam: "Gimnasia L. P.",
        kickoffAt: new Date(finalsBase + 1000 * 60 * 225).toISOString(),
        status: "final"
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

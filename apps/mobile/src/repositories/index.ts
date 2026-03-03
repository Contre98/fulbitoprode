import type { FixtureRepository, GroupsRepository, LeaderboardRepository, PredictionsRepository } from "@fulbito/api-contracts";
import { httpFixtureRepository, httpGroupsRepository, httpLeaderboardRepository, httpPredictionsRepository } from "@/repositories/httpDataRepositories";
import { mockFixtureRepository, mockGroupsRepository, mockLeaderboardRepository, mockPredictionsRepository } from "@/repositories/mockDataRepositories";

function logFallback(scope: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.warn(`[repositories] ${scope} HTTP failed, using mock fallback: ${message}`);
}

export const predictionsRepository: PredictionsRepository = {
  async listPredictions(input) {
    try {
      return await httpPredictionsRepository.listPredictions(input);
    } catch (error) {
      logFallback("predictions.listPredictions", error);
      return mockPredictionsRepository.listPredictions(input);
    }
  },
  async savePrediction(input) {
    try {
      return await httpPredictionsRepository.savePrediction(input);
    } catch (error) {
      logFallback("predictions.savePrediction", error);
      return mockPredictionsRepository.savePrediction(input);
    }
  }
};

export const fixtureRepository: FixtureRepository = {
  async listFixture(input) {
    try {
      return await httpFixtureRepository.listFixture(input);
    } catch (error) {
      logFallback("fixture.listFixture", error);
      return mockFixtureRepository.listFixture(input);
    }
  }
};

export const leaderboardRepository: LeaderboardRepository = {
  async getLeaderboard(input) {
    try {
      return await httpLeaderboardRepository.getLeaderboard(input);
    } catch (error) {
      logFallback("leaderboard.getLeaderboard", error);
      return mockLeaderboardRepository.getLeaderboard(input);
    }
  }
};

export const groupsRepository: GroupsRepository = {
  async listGroups() {
    try {
      return await httpGroupsRepository.listGroups();
    } catch (error) {
      logFallback("groups.listGroups", error);
      return mockGroupsRepository.listGroups();
    }
  },
  async listMemberships() {
    try {
      return await httpGroupsRepository.listMemberships();
    } catch (error) {
      logFallback("groups.listMemberships", error);
      return mockGroupsRepository.listMemberships();
    }
  }
};

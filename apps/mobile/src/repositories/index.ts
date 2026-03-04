import type { AuthRepository, FixtureRepository, GroupsRepository, LeaderboardRepository, PredictionsRepository } from "@fulbito/api-contracts";
import { canUseHttpSession, setUseHttpSession } from "@/repositories/authBridgeState";
import { clearFallbackFailure, reportFallbackFailure } from "@/repositories/fallbackDiagnostics";
import { httpAuthRepository } from "@/repositories/httpAuthRepository";
import { httpFixtureRepository, httpGroupsRepository, httpLeaderboardRepository, httpPredictionsRepository } from "@/repositories/httpDataRepositories";
import { mockFixtureRepository, mockGroupsRepository, mockLeaderboardRepository, mockPredictionsRepository } from "@/repositories/mockDataRepositories";
import { mockAuthRepository } from "@/repositories/mockAuthRepository";

function logFallback(scope: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  reportFallbackFailure(scope, error);
  console.warn(`[repositories] ${scope} HTTP failed, using mock fallback: ${message}`);
}

export const predictionsRepository: PredictionsRepository = {
  async listPredictions(input) {
    if (!canUseHttpSession()) {
      return mockPredictionsRepository.listPredictions(input);
    }
    try {
      const result = await httpPredictionsRepository.listPredictions(input);
      clearFallbackFailure();
      return result;
    } catch (error) {
      logFallback("predictions.listPredictions", error);
      return mockPredictionsRepository.listPredictions(input);
    }
  },
  async savePrediction(input) {
    if (!canUseHttpSession()) {
      return mockPredictionsRepository.savePrediction(input);
    }
    try {
      const result = await httpPredictionsRepository.savePrediction(input);
      clearFallbackFailure();
      return result;
    } catch (error) {
      logFallback("predictions.savePrediction", error);
      return mockPredictionsRepository.savePrediction(input);
    }
  }
};

export const fixtureRepository: FixtureRepository = {
  async listFixture(input) {
    if (!canUseHttpSession()) {
      return mockFixtureRepository.listFixture(input);
    }
    try {
      const result = await httpFixtureRepository.listFixture(input);
      clearFallbackFailure();
      return result;
    } catch (error) {
      logFallback("fixture.listFixture", error);
      return mockFixtureRepository.listFixture(input);
    }
  }
};

export const leaderboardRepository: LeaderboardRepository = {
  async getLeaderboard(input) {
    if (!canUseHttpSession()) {
      return mockLeaderboardRepository.getLeaderboard(input);
    }
    try {
      const result = await httpLeaderboardRepository.getLeaderboard(input);
      clearFallbackFailure();
      return result;
    } catch (error) {
      logFallback("leaderboard.getLeaderboard", error);
      return mockLeaderboardRepository.getLeaderboard(input);
    }
  }
};

export const groupsRepository: GroupsRepository = {
  async listGroups() {
    if (!canUseHttpSession()) {
      return mockGroupsRepository.listGroups();
    }
    try {
      const result = await httpGroupsRepository.listGroups();
      clearFallbackFailure();
      return result;
    } catch (error) {
      logFallback("groups.listGroups", error);
      return mockGroupsRepository.listGroups();
    }
  },
  async listMemberships() {
    if (!canUseHttpSession()) {
      return mockGroupsRepository.listMemberships();
    }
    try {
      const result = await httpGroupsRepository.listMemberships();
      clearFallbackFailure();
      return result;
    } catch (error) {
      logFallback("groups.listMemberships", error);
      return mockGroupsRepository.listMemberships();
    }
  },
  async createGroup(input) {
    if (!canUseHttpSession()) {
      return mockGroupsRepository.createGroup(input);
    }
    try {
      const result = await httpGroupsRepository.createGroup(input);
      clearFallbackFailure();
      return result;
    } catch (error) {
      logFallback("groups.createGroup", error);
      return mockGroupsRepository.createGroup(input);
    }
  },
  async joinGroup(input) {
    if (!canUseHttpSession()) {
      return mockGroupsRepository.joinGroup(input);
    }
    try {
      const result = await httpGroupsRepository.joinGroup(input);
      clearFallbackFailure();
      return result;
    } catch (error) {
      logFallback("groups.joinGroup", error);
      return mockGroupsRepository.joinGroup(input);
    }
  }
};

export const authRepository: AuthRepository = {
  async getSession() {
    try {
      const session = await httpAuthRepository.getSession();
      setUseHttpSession(true);
      clearFallbackFailure();
      return session;
    } catch (error) {
      logFallback("auth.getSession", error);
      setUseHttpSession(false);
      return mockAuthRepository.getSession();
    }
  },
  async loginWithPassword(email, password) {
    try {
      const session = await httpAuthRepository.loginWithPassword(email, password);
      setUseHttpSession(true);
      clearFallbackFailure();
      return session;
    } catch (error) {
      logFallback("auth.loginWithPassword", error);
      setUseHttpSession(false);
      return mockAuthRepository.loginWithPassword(email, password);
    }
  },
  async registerWithPassword(input) {
    try {
      const session = await httpAuthRepository.registerWithPassword(input);
      setUseHttpSession(true);
      clearFallbackFailure();
      return session;
    } catch (error) {
      logFallback("auth.registerWithPassword", error);
      setUseHttpSession(false);
      return mockAuthRepository.registerWithPassword(input);
    }
  },
  async logout() {
    if (canUseHttpSession()) {
      try {
        await httpAuthRepository.logout();
        clearFallbackFailure();
      } catch (error) {
        logFallback("auth.logout", error);
      }
    }
    setUseHttpSession(false);
    await mockAuthRepository.logout();
  }
};

import type {
  AuthRepository,
  FixtureRepository,
  GroupsRepository,
  LeaderboardRepository,
  NotificationsRepository,
  PredictionsRepository,
  ProfileRepository
} from "@fulbito/api-contracts";
import { canUseHttpSession, setUseHttpSession } from "@/repositories/authBridgeState";
import { clearFallbackFailure, reportFallbackFailure } from "@/repositories/fallbackDiagnostics";
import { httpAuthRepository } from "@/repositories/httpAuthRepository";
import {
  httpFixtureRepository,
  httpGroupsRepository,
  httpLeaderboardRepository,
  httpNotificationsRepository,
  httpPredictionsRepository,
  httpProfileRepository
} from "@/repositories/httpDataRepositories";
import {
  mockGroupsRepository,
  mockLeaderboardRepository,
  mockNotificationsRepository,
  mockPredictionsRepository,
  mockProfileRepository
} from "@/repositories/mockDataRepositories";
import { mockAuthRepository } from "@/repositories/mockAuthRepository";

function isMockFallbackEnabled() {
  const raw = process.env.EXPO_PUBLIC_ENABLE_MOCK_FALLBACK?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

function logFallback(scope: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  reportFallbackFailure(scope, error);
  console.warn(`[repositories] ${scope} HTTP failed, using mock fallback: ${message}`);
}

function maybeFallback(scope: string, error: unknown) {
  if (!isMockFallbackEnabled()) {
    clearFallbackFailure();
    throw error;
  }
  logFallback(scope, error);
}

export const predictionsRepository: PredictionsRepository = {
  async listPredictions(input) {
    if (!canUseHttpSession()) {
      if (!isMockFallbackEnabled()) {
        return [];
      }
      return mockPredictionsRepository.listPredictions(input);
    }
    try {
      const result = await httpPredictionsRepository.listPredictions(input);
      clearFallbackFailure();
      return result;
    } catch (error) {
      maybeFallback("predictions.listPredictions", error);
      return mockPredictionsRepository.listPredictions(input);
    }
  },
  async savePrediction(input) {
    if (!canUseHttpSession()) {
      if (!isMockFallbackEnabled()) {
        throw new Error("HTTP session unavailable for savePrediction");
      }
      return mockPredictionsRepository.savePrediction(input);
    }
    try {
      const result = await httpPredictionsRepository.savePrediction(input);
      clearFallbackFailure();
      return result;
    } catch (error) {
      maybeFallback("predictions.savePrediction", error);
      return mockPredictionsRepository.savePrediction(input);
    }
  }
};

export const fixtureRepository: FixtureRepository = {
  async listFixture(input) {
    if (!canUseHttpSession()) {
      return [];
    }

    try {
      const result = await httpFixtureRepository.listFixture(input);
      clearFallbackFailure();
      return result;
    } catch (error) {
      reportFallbackFailure("fixture.listFixture", error);
      throw error;
    }
  }
};

export const leaderboardRepository: LeaderboardRepository = {
  async getLeaderboardPayload(input) {
    if (!canUseHttpSession()) {
      if (!isMockFallbackEnabled()) {
        return {
          groupLabel: "",
          mode: input.mode === "stats" ? "stats" : "posiciones",
          period: input.fecha,
          periodLabel: input.fecha,
          updatedAt: new Date().toISOString(),
          rows: [],
          groupStats: null,
          stats: null
        };
      }
      return mockLeaderboardRepository.getLeaderboardPayload(input);
    }
    try {
      const result = await httpLeaderboardRepository.getLeaderboardPayload(input);
      clearFallbackFailure();
      return result;
    } catch (error) {
      maybeFallback("leaderboard.getLeaderboardPayload", error);
      return mockLeaderboardRepository.getLeaderboardPayload(input);
    }
  },
  async getLeaderboard(input) {
    if (!canUseHttpSession()) {
      if (!isMockFallbackEnabled()) {
        return [];
      }
      return mockLeaderboardRepository.getLeaderboard(input);
    }
    try {
      const result = await httpLeaderboardRepository.getLeaderboard(input);
      clearFallbackFailure();
      return result;
    } catch (error) {
      maybeFallback("leaderboard.getLeaderboard", error);
      return mockLeaderboardRepository.getLeaderboard(input);
    }
  }
};

export const groupsRepository: GroupsRepository = {
  async listGroups() {
    if (!canUseHttpSession()) {
      if (!isMockFallbackEnabled()) {
        return [];
      }
      return mockGroupsRepository.listGroups();
    }
    try {
      const result = await httpGroupsRepository.listGroups();
      clearFallbackFailure();
      return result;
    } catch (error) {
      maybeFallback("groups.listGroups", error);
      return mockGroupsRepository.listGroups();
    }
  },
  async listMemberships() {
    if (!canUseHttpSession()) {
      if (!isMockFallbackEnabled()) {
        return [];
      }
      return mockGroupsRepository.listMemberships();
    }
    try {
      const result = await httpGroupsRepository.listMemberships();
      clearFallbackFailure();
      return result;
    } catch (error) {
      maybeFallback("groups.listMemberships", error);
      return mockGroupsRepository.listMemberships();
    }
  },
  async searchGroups(input) {
    if (!canUseHttpSession()) {
      if (!isMockFallbackEnabled()) {
        const page = typeof input.page === "number" ? input.page : 1;
        const perPage = typeof input.perPage === "number" ? input.perPage : 20;
        return {
          groups: [],
          page,
          perPage,
          totalItems: 0,
          totalPages: 0,
          hasMore: false
        };
      }
      return mockGroupsRepository.searchGroups(input);
    }
    try {
      const result = await httpGroupsRepository.searchGroups(input);
      clearFallbackFailure();
      return result;
    } catch (error) {
      maybeFallback("groups.searchGroups", error);
      return mockGroupsRepository.searchGroups(input);
    }
  },
  async createGroup(input) {
    if (!canUseHttpSession()) {
      if (!isMockFallbackEnabled()) {
        throw new Error("HTTP session unavailable for createGroup");
      }
      return mockGroupsRepository.createGroup(input);
    }
    try {
      const result = await httpGroupsRepository.createGroup(input);
      clearFallbackFailure();
      return result;
    } catch (error) {
      maybeFallback("groups.createGroup", error);
      return mockGroupsRepository.createGroup(input);
    }
  },
  async joinGroup(input) {
    if (!canUseHttpSession()) {
      if (!isMockFallbackEnabled()) {
        throw new Error("HTTP session unavailable for joinGroup");
      }
      return mockGroupsRepository.joinGroup(input);
    }
    try {
      const result = await httpGroupsRepository.joinGroup(input);
      clearFallbackFailure();
      return result;
    } catch (error) {
      maybeFallback("groups.joinGroup", error);
      return mockGroupsRepository.joinGroup(input);
    }
  },
  async updateGroupName(input) {
    if (!canUseHttpSession()) {
      if (!isMockFallbackEnabled()) {
        throw new Error("HTTP session unavailable for updateGroupName");
      }
      return mockGroupsRepository.updateGroupName(input);
    }
    try {
      const result = await httpGroupsRepository.updateGroupName(input);
      clearFallbackFailure();
      return result;
    } catch (error) {
      maybeFallback("groups.updateGroupName", error);
      return mockGroupsRepository.updateGroupName(input);
    }
  },
  async listMembers(input) {
    if (!canUseHttpSession()) {
      if (!isMockFallbackEnabled()) {
        return {
          members: [],
          viewerRole: "member",
          canManage: false
        };
      }
      return mockGroupsRepository.listMembers(input);
    }
    try {
      const result = await httpGroupsRepository.listMembers(input);
      clearFallbackFailure();
      return result;
    } catch (error) {
      maybeFallback("groups.listMembers", error);
      return mockGroupsRepository.listMembers(input);
    }
  },
  async updateMemberRole(input) {
    if (!canUseHttpSession()) {
      if (!isMockFallbackEnabled()) {
        throw new Error("HTTP session unavailable for updateMemberRole");
      }
      return mockGroupsRepository.updateMemberRole(input);
    }
    try {
      const result = await httpGroupsRepository.updateMemberRole(input);
      clearFallbackFailure();
      return result;
    } catch (error) {
      maybeFallback("groups.updateMemberRole", error);
      return mockGroupsRepository.updateMemberRole(input);
    }
  },
  async removeMember(input) {
    if (!canUseHttpSession()) {
      if (!isMockFallbackEnabled()) {
        throw new Error("HTTP session unavailable for removeMember");
      }
      return mockGroupsRepository.removeMember(input);
    }
    try {
      const result = await httpGroupsRepository.removeMember(input);
      clearFallbackFailure();
      return result;
    } catch (error) {
      maybeFallback("groups.removeMember", error);
      return mockGroupsRepository.removeMember(input);
    }
  },
  async leaveGroup(input) {
    if (!canUseHttpSession()) {
      if (!isMockFallbackEnabled()) {
        throw new Error("HTTP session unavailable for leaveGroup");
      }
      return mockGroupsRepository.leaveGroup(input);
    }
    try {
      const result = await httpGroupsRepository.leaveGroup(input);
      clearFallbackFailure();
      return result;
    } catch (error) {
      maybeFallback("groups.leaveGroup", error);
      return mockGroupsRepository.leaveGroup(input);
    }
  },
  async deleteGroup(input) {
    if (!canUseHttpSession()) {
      if (!isMockFallbackEnabled()) {
        throw new Error("HTTP session unavailable for deleteGroup");
      }
      return mockGroupsRepository.deleteGroup(input);
    }
    try {
      const result = await httpGroupsRepository.deleteGroup(input);
      clearFallbackFailure();
      return result;
    } catch (error) {
      maybeFallback("groups.deleteGroup", error);
      return mockGroupsRepository.deleteGroup(input);
    }
  },
  async getInvite(input) {
    if (!canUseHttpSession()) {
      if (!isMockFallbackEnabled()) {
        return {
          invite: null,
          canRefresh: false
        };
      }
      return mockGroupsRepository.getInvite(input);
    }
    try {
      const result = await httpGroupsRepository.getInvite(input);
      clearFallbackFailure();
      return result;
    } catch (error) {
      maybeFallback("groups.getInvite", error);
      return mockGroupsRepository.getInvite(input);
    }
  },
  async refreshInvite(input) {
    if (!canUseHttpSession()) {
      if (!isMockFallbackEnabled()) {
        throw new Error("HTTP session unavailable for refreshInvite");
      }
      return mockGroupsRepository.refreshInvite(input);
    }
    try {
      const result = await httpGroupsRepository.refreshInvite(input);
      clearFallbackFailure();
      return result;
    } catch (error) {
      maybeFallback("groups.refreshInvite", error);
      return mockGroupsRepository.refreshInvite(input);
    }
  },
  async listJoinRequests(input) {
    if (!canUseHttpSession()) {
      if (!isMockFallbackEnabled()) {
        return { requests: [] };
      }
      return mockGroupsRepository.listJoinRequests(input);
    }
    try {
      const result = await httpGroupsRepository.listJoinRequests(input);
      clearFallbackFailure();
      return result;
    } catch (error) {
      maybeFallback("groups.listJoinRequests", error);
      return mockGroupsRepository.listJoinRequests(input);
    }
  },
  async respondToJoinRequest(input) {
    if (!canUseHttpSession()) {
      if (!isMockFallbackEnabled()) {
        throw new Error("HTTP session unavailable for respondToJoinRequest");
      }
      return mockGroupsRepository.respondToJoinRequest(input);
    }
    try {
      const result = await httpGroupsRepository.respondToJoinRequest(input);
      clearFallbackFailure();
      return result;
    } catch (error) {
      maybeFallback("groups.respondToJoinRequest", error);
      return mockGroupsRepository.respondToJoinRequest(input);
    }
  }
};

export const profileRepository: ProfileRepository = {
  async getProfile() {
    if (!canUseHttpSession()) {
      if (!isMockFallbackEnabled()) {
        return {
          stats: {
            totalPoints: 0,
            accuracyPct: 0,
            groups: 0
          },
          recentActivity: [],
          updatedAt: new Date().toISOString()
        };
      }
      return mockProfileRepository.getProfile();
    }
    try {
      const result = await httpProfileRepository.getProfile();
      clearFallbackFailure();
      return result;
    } catch (error) {
      maybeFallback("profile.getProfile", error);
      return mockProfileRepository.getProfile();
    }
  },
  async updateProfile(input) {
    if (!canUseHttpSession()) {
      if (!isMockFallbackEnabled()) {
        throw new Error("HTTP session unavailable for updateProfile");
      }
      return mockProfileRepository.updateProfile(input);
    }
    try {
      const result = await httpProfileRepository.updateProfile(input);
      clearFallbackFailure();
      return result;
    } catch (error) {
      maybeFallback("profile.updateProfile", error);
      return mockProfileRepository.updateProfile(input);
    }
  }
};

export const notificationsRepository: NotificationsRepository = {
  async getPreferences() {
    if (!canUseHttpSession()) {
      if (!isMockFallbackEnabled()) {
        return { reminders: false, results: false, social: false };
      }
      return mockNotificationsRepository.getPreferences();
    }
    try {
      const result = await httpNotificationsRepository.getPreferences();
      clearFallbackFailure();
      return result;
    } catch (error) {
      maybeFallback("notifications.getPreferences", error);
      return mockNotificationsRepository.getPreferences();
    }
  },
  async updatePreferences(input) {
    if (!canUseHttpSession()) {
      if (!isMockFallbackEnabled()) {
        throw new Error("HTTP session unavailable for updatePreferences");
      }
      return mockNotificationsRepository.updatePreferences(input);
    }
    try {
      const result = await httpNotificationsRepository.updatePreferences(input);
      clearFallbackFailure();
      return result;
    } catch (error) {
      maybeFallback("notifications.updatePreferences", error);
      return mockNotificationsRepository.updatePreferences(input);
    }
  },
  async listInbox() {
    if (!canUseHttpSession()) {
      if (!isMockFallbackEnabled()) {
        return { items: [], unreadCount: 0, weeklyWinner: null };
      }
      return mockNotificationsRepository.listInbox();
    }
    try {
      const result = await httpNotificationsRepository.listInbox();
      clearFallbackFailure();
      return result;
    } catch (error) {
      maybeFallback("notifications.listInbox", error);
      return mockNotificationsRepository.listInbox();
    }
  },
  async markAllRead() {
    if (!canUseHttpSession()) {
      if (!isMockFallbackEnabled()) {
        return { ok: true };
      }
      return mockNotificationsRepository.markAllRead();
    }
    try {
      const result = await httpNotificationsRepository.markAllRead();
      clearFallbackFailure();
      return result;
    } catch (error) {
      maybeFallback("notifications.markAllRead", error);
      return mockNotificationsRepository.markAllRead();
    }
  },
  async registerDeviceToken(input) {
    if (!canUseHttpSession()) {
      if (!isMockFallbackEnabled()) {
        return { ok: true };
      }
      return mockNotificationsRepository.registerDeviceToken(input);
    }
    try {
      const result = await httpNotificationsRepository.registerDeviceToken(input);
      clearFallbackFailure();
      return result;
    } catch (error) {
      maybeFallback("notifications.registerDeviceToken", error);
      return mockNotificationsRepository.registerDeviceToken(input);
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
      if (isMockFallbackEnabled()) {
        logFallback("auth.getSession", error);
        setUseHttpSession(false);
        return mockAuthRepository.getSession();
      }
      setUseHttpSession(false);
      clearFallbackFailure();
      return null;
    }
  },
  async loginWithPassword(email, password) {
    try {
      const session = await httpAuthRepository.loginWithPassword(email, password);
      setUseHttpSession(true);
      clearFallbackFailure();
      return session;
    } catch (error) {
      maybeFallback("auth.loginWithPassword", error);
      setUseHttpSession(false);
      return mockAuthRepository.loginWithPassword(email, password);
    }
  },
  async loginWithGoogleIdToken(idToken) {
    try {
      const session = await httpAuthRepository.loginWithGoogleIdToken(idToken);
      setUseHttpSession(true);
      clearFallbackFailure();
      return session;
    } catch (error) {
      maybeFallback("auth.loginWithGoogleIdToken", error);
      setUseHttpSession(false);
      return mockAuthRepository.loginWithGoogleIdToken(idToken);
    }
  },
  async registerWithPassword(input) {
    try {
      const session = await httpAuthRepository.registerWithPassword(input);
      setUseHttpSession(true);
      clearFallbackFailure();
      return session;
    } catch (error) {
      maybeFallback("auth.registerWithPassword", error);
      setUseHttpSession(false);
      return mockAuthRepository.registerWithPassword(input);
    }
  },
  async requestPasswordReset(email) {
    try {
      const result = await httpAuthRepository.requestPasswordReset(email);
      setUseHttpSession(true);
      clearFallbackFailure();
      return result;
    } catch (error) {
      maybeFallback("auth.requestPasswordReset", error);
      setUseHttpSession(false);
      return mockAuthRepository.requestPasswordReset(email);
    }
  },
  async changePassword(input) {
    try {
      const result = await httpAuthRepository.changePassword(input);
      setUseHttpSession(true);
      clearFallbackFailure();
      return result;
    } catch (error) {
      maybeFallback("auth.changePassword", error);
      setUseHttpSession(false);
      return mockAuthRepository.changePassword(input);
    }
  },
  async deleteAccount() {
    try {
      const result = await httpAuthRepository.deleteAccount();
      setUseHttpSession(false);
      clearFallbackFailure();
      return result;
    } catch (error) {
      maybeFallback("auth.deleteAccount", error);
      setUseHttpSession(false);
      return mockAuthRepository.deleteAccount();
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

export { periodRepository, DEFAULT_PERIOD_OPTIONS } from "@/repositories/periodRepository";

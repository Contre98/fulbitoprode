import { render } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AppNavigation } from "@/navigation/AppNavigation";
import { fixtureRepository, groupsRepository, leaderboardRepository, predictionsRepository, profileRepository } from "@/repositories";
import { useAuth } from "@/state/AuthContext";
import { useGroupSelection } from "@/state/GroupContext";
import { usePeriod } from "@/state/PeriodContext";
import type { Membership, User } from "@fulbito/domain";

jest.mock("@/repositories", () => ({
  fixtureRepository: {
    listFixture: jest.fn()
  },
  predictionsRepository: {
    listPredictions: jest.fn(),
    savePrediction: jest.fn()
  },
  leaderboardRepository: {
    getLeaderboard: jest.fn(),
    getLeaderboardPayload: jest.fn()
  },
  profileRepository: {
    getProfile: jest.fn(),
    updateProfile: jest.fn()
  },
  groupsRepository: {
    createGroup: jest.fn(),
    joinGroup: jest.fn(),
    updateGroupName: jest.fn(),
    listMembers: jest.fn(),
    updateMemberRole: jest.fn(),
    removeMember: jest.fn(),
    leaveGroup: jest.fn(),
    deleteGroup: jest.fn(),
    getInvite: jest.fn(),
    refreshInvite: jest.fn(),
    listJoinRequests: jest.fn(),
    respondToJoinRequest: jest.fn()
  }
}));

jest.mock("@/state/AuthContext", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: jest.fn()
}));

jest.mock("@/state/GroupContext", () => ({
  GroupProvider: ({ children }: { children: ReactNode }) => children,
  useGroupSelection: jest.fn()
}));

jest.mock("@/state/PeriodContext", () => ({
  PeriodProvider: ({ children }: { children: ReactNode }) => children,
  usePeriod: jest.fn()
}));

jest.mock("@/state/PendingInviteContext", () => ({
  PendingInviteProvider: ({ children }: { children: ReactNode }) => children,
  usePendingInvite: () => ({
    hydrated: true,
    pendingInviteToken: null,
    setPendingInviteToken: jest.fn().mockResolvedValue(undefined),
    clearPendingInviteToken: jest.fn().mockResolvedValue(undefined)
  })
}));

export const mockedUseAuth = useAuth as unknown as jest.Mock;
export const mockedUseGroupSelection = useGroupSelection as unknown as jest.Mock;
export const mockedUsePeriod = usePeriod as unknown as jest.Mock;

export const mockedFixtureList = fixtureRepository.listFixture as unknown as jest.Mock;
export const mockedPredictionsList = predictionsRepository.listPredictions as unknown as jest.Mock;
export const mockedPredictionsSave = predictionsRepository.savePrediction as unknown as jest.Mock;
export const mockedLeaderboardGet = leaderboardRepository.getLeaderboard as unknown as jest.Mock;
export const mockedLeaderboardPayloadGet = leaderboardRepository.getLeaderboardPayload as unknown as jest.Mock;
export const mockedProfileGet = profileRepository.getProfile as unknown as jest.Mock;
export const mockedProfileUpdate = profileRepository.updateProfile as unknown as jest.Mock;
export const mockedGroupsCreate = groupsRepository.createGroup as unknown as jest.Mock;
export const mockedGroupsJoin = groupsRepository.joinGroup as unknown as jest.Mock;
export const mockedGroupsUpdateGroupName = groupsRepository.updateGroupName as unknown as jest.Mock;
export const mockedGroupsListMembers = groupsRepository.listMembers as unknown as jest.Mock;
export const mockedGroupsUpdateMemberRole = groupsRepository.updateMemberRole as unknown as jest.Mock;
export const mockedGroupsRemoveMember = groupsRepository.removeMember as unknown as jest.Mock;
export const mockedGroupsLeave = groupsRepository.leaveGroup as unknown as jest.Mock;
export const mockedGroupsDelete = groupsRepository.deleteGroup as unknown as jest.Mock;
export const mockedGroupsGetInvite = groupsRepository.getInvite as unknown as jest.Mock;
export const mockedGroupsRefreshInvite = groupsRepository.refreshInvite as unknown as jest.Mock;

export const DEFAULT_USER: User = {
  id: "u-1",
  email: "qa@example.com",
  name: "QA User"
};

export const DEFAULT_MEMBERSHIP: Membership = {
  groupId: "g-1",
  groupName: "Grupo Amigos",
  leagueId: 128,
  leagueName: "Liga Profesional",
  competitionStage: "apertura",
  season: "2026",
  role: "owner",
  joinedAt: "2026-01-01T00:00:00.000Z"
};

export function mockAuthState(overrides?: Record<string, unknown>) {
  return {
    loading: false,
    isAuthenticated: true,
    session: {
      user: DEFAULT_USER,
      memberships: []
    },
    dataMode: "mock",
    fallbackIssue: null,
    fallbackHistory: [],
    refresh: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
    requestPasswordReset: jest.fn().mockResolvedValue({
      ok: true,
      message: "If an account exists for this email, we sent password reset instructions."
    }),
    logout: jest.fn().mockResolvedValue(undefined),
    retryHttpMode: jest.fn(),
    clearFallbackDiagnosticsHistory: jest.fn(),
    ...(overrides ?? {})
  };
}

export function mockGroupSelectionState(overrides?: Record<string, unknown>) {
  return {
    memberships: [DEFAULT_MEMBERSHIP],
    selectedGroupId: DEFAULT_MEMBERSHIP.groupId,
    setSelectedGroupId: jest.fn(),
    ...(overrides ?? {})
  };
}

export function mockPeriodState(overrides?: Record<string, unknown>) {
  return {
    fecha: 1,
    options: [{ id: 1, label: "Fecha 1" }],
    setFecha: jest.fn(),
    ...(overrides ?? {})
  };
}

export function createNavigationTree() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AppNavigation />
    </QueryClientProvider>
  );
}

export function renderAppNavigation() {
  return render(createNavigationTree());
}

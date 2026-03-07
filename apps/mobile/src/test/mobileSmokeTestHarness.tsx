import { render } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AppNavigation } from "@/navigation/AppNavigation";
import { fixtureRepository, groupsRepository, leaderboardRepository, predictionsRepository } from "@/repositories";
import { useAuth } from "@/state/AuthContext";
import { useGroupSelection } from "@/state/GroupContext";
import { usePeriod } from "@/state/PeriodContext";

jest.mock("@/repositories", () => ({
  fixtureRepository: {
    listFixture: jest.fn()
  },
  predictionsRepository: {
    listPredictions: jest.fn(),
    savePrediction: jest.fn()
  },
  leaderboardRepository: {
    getLeaderboard: jest.fn()
  },
  groupsRepository: {
    createGroup: jest.fn(),
    joinGroup: jest.fn()
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

export const mockedUseAuth = useAuth as unknown as jest.Mock;
export const mockedUseGroupSelection = useGroupSelection as unknown as jest.Mock;
export const mockedUsePeriod = usePeriod as unknown as jest.Mock;

export const mockedFixtureList = fixtureRepository.listFixture as unknown as jest.Mock;
export const mockedPredictionsList = predictionsRepository.listPredictions as unknown as jest.Mock;
export const mockedPredictionsSave = predictionsRepository.savePrediction as unknown as jest.Mock;
export const mockedLeaderboardGet = leaderboardRepository.getLeaderboard as unknown as jest.Mock;
export const mockedGroupsCreate = groupsRepository.createGroup as unknown as jest.Mock;
export const mockedGroupsJoin = groupsRepository.joinGroup as unknown as jest.Mock;

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

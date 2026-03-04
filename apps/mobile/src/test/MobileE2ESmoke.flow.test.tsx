import { fireEvent, render, waitFor } from "@testing-library/react-native";
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

const mockedUseAuth = useAuth as unknown as jest.Mock;
const mockedUseGroupSelection = useGroupSelection as unknown as jest.Mock;
const mockedUsePeriod = usePeriod as unknown as jest.Mock;

const mockedFixtureList = fixtureRepository.listFixture as unknown as jest.Mock;
const mockedPredictionsList = predictionsRepository.listPredictions as unknown as jest.Mock;
const mockedPredictionsSave = predictionsRepository.savePrediction as unknown as jest.Mock;
const mockedLeaderboardGet = leaderboardRepository.getLeaderboard as unknown as jest.Mock;
const mockedGroupsCreate = groupsRepository.createGroup as unknown as jest.Mock;
const mockedGroupsJoin = groupsRepository.joinGroup as unknown as jest.Mock;

function renderAppNavigation() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={client}>
      <AppNavigation />
    </QueryClientProvider>
  );
}

describe("Mobile E2E smoke flow", () => {
  it("covers Inicio -> Pronosticos save -> Grupos create/join", async () => {
    const setSelectedGroupId = jest.fn();
    const refresh = jest.fn().mockResolvedValue(undefined);

    mockedUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      session: {
        user: { id: "u-1", email: "qa@example.com", name: "QA User" },
        memberships: []
      },
      dataMode: "mock",
      fallbackIssue: null,
      fallbackHistory: [],
      refresh,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn().mockResolvedValue(undefined),
      retryHttpMode: jest.fn(),
      clearFallbackDiagnosticsHistory: jest.fn()
    });

    mockedUseGroupSelection.mockReturnValue({
      memberships: [
        {
          groupId: "g-1",
          groupName: "Grupo Amigos",
          leagueId: 128,
          leagueName: "Liga Profesional",
          competitionStage: "apertura",
          season: "2026",
          role: "owner",
          joinedAt: "2026-01-01T00:00:00.000Z"
        }
      ],
      selectedGroupId: "g-1",
      setSelectedGroupId
    });

    mockedUsePeriod.mockReturnValue({
      fecha: 1,
      options: [
        { id: 1, label: "Fecha 1" },
        { id: 2, label: "Fecha 2" }
      ],
      setFecha: jest.fn()
    });

    mockedFixtureList.mockResolvedValue([
      {
        id: "fx-upcoming-arg-lan",
        homeTeam: "Argentinos Juniors",
        awayTeam: "Lanus",
        kickoffAt: "2026-03-06T22:00:00.000Z",
        status: "upcoming"
      },
      {
        id: "fx-final-1-1-def-bel",
        homeTeam: "Defensa Y Justicia",
        awayTeam: "Belgrano Cordoba",
        kickoffAt: "2026-03-04T22:00:00.000Z",
        status: "final"
      }
    ]);

    mockedPredictionsList.mockResolvedValue([]);
    mockedPredictionsSave.mockResolvedValue(undefined);
    mockedLeaderboardGet.mockResolvedValue([
      { userId: "u-1", displayName: "Usuario Fulbito", points: 18, rank: 1 }
    ]);
    mockedGroupsCreate.mockResolvedValue({ id: "g-2", name: "Grupo QA" });
    mockedGroupsJoin.mockResolvedValue({ id: "g-3", name: "Grupo Join" });

    const screen = renderAppNavigation();

    await waitFor(() => {
      expect(screen.getAllByText("Inicio").length).toBeGreaterThan(0);
      expect(screen.getByText("Próximos Partidos")).toBeTruthy();
    });

    fireEvent.press(screen.getAllByText("Pronósticos")[0]);

    await waitFor(() => {
      expect(screen.getByText("Guardar pronóstico")).toBeTruthy();
    });

    const scoreInputs = screen.getAllByPlaceholderText("-");
    fireEvent.changeText(scoreInputs[0], "2");
    fireEvent.changeText(scoreInputs[1], "1");
    fireEvent.press(screen.getByText("Guardar pronóstico"));

    await waitFor(() => {
      expect(mockedPredictionsSave).toHaveBeenCalledWith({
        groupId: "g-1",
        fecha: 1,
        prediction: {
          fixtureId: "fx-upcoming-arg-lan",
          home: 2,
          away: 1
        }
      });
    });

    fireEvent.press(screen.getAllByText("Grupos")[0]);

    await waitFor(() => {
      expect(screen.getByText("Crear Grupo")).toBeTruthy();
    });

    fireEvent.changeText(screen.getByPlaceholderText("Nombre del nuevo grupo"), "Grupo QA");
    fireEvent.press(screen.getByText("+"));

    await waitFor(() => {
      expect(mockedGroupsCreate).toHaveBeenCalledWith({
        name: "Grupo QA",
        competitionStage: "apertura",
        competitionName: "Liga Profesional",
        competitionKey: "argentina-128",
        leagueId: 128,
        season: "2026"
      });
    });

    fireEvent.press(screen.getByText("Unirse"));
    fireEvent.changeText(screen.getByPlaceholderText("Código de invitación"), "INV-123");
    fireEvent.press(screen.getByText("Unirse al grupo"));

    await waitFor(() => {
      expect(mockedGroupsJoin).toHaveBeenCalledWith({ codeOrToken: "INV-123" });
    });

    await waitFor(() => {
      expect(refresh).toHaveBeenCalled();
      expect(setSelectedGroupId).toHaveBeenCalled();
    });
  });
});

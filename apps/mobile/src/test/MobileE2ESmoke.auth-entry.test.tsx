import { fireEvent, waitFor } from "@testing-library/react-native";
import {
  createNavigationTree,
  mockedFixtureList,
  mockedLeaderboardGet,
  mockedPredictionsList,
  mockedUseAuth,
  mockedUseGroupSelection,
  mockedUsePeriod,
  renderAppNavigation
} from "./mobileSmokeTestHarness";

describe("Mobile E2E smoke auth-entry", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("covers AuthScreen login gate into Inicio", async () => {
    const login = jest.fn(async () => {
      isAuthenticated = true;
    });
    const logout = jest.fn().mockResolvedValue(undefined);
    let isAuthenticated = false;

    mockedUseAuth.mockImplementation(() => ({
      loading: false,
      isAuthenticated,
      session: isAuthenticated
        ? {
            user: { id: "u-1", email: "qa@example.com", name: "QA User" },
            memberships: []
          }
        : null,
      dataMode: "mock",
      fallbackIssue: null,
      fallbackHistory: [],
      refresh: jest.fn(),
      login,
      register: jest.fn(),
      logout,
      retryHttpMode: jest.fn(),
      clearFallbackDiagnosticsHistory: jest.fn()
    }));

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
      setSelectedGroupId: jest.fn()
    });

    mockedUsePeriod.mockReturnValue({
      fecha: 1,
      options: [{ id: 1, label: "Fecha 1" }],
      setFecha: jest.fn()
    });

    mockedFixtureList.mockResolvedValue([
      {
        id: "fx-upcoming-arg-lan",
        homeTeam: "Argentinos Juniors",
        awayTeam: "Lanus",
        kickoffAt: "2026-03-06T22:00:00.000Z",
        status: "upcoming"
      }
    ]);
    mockedPredictionsList.mockResolvedValue([]);
    mockedLeaderboardGet.mockResolvedValue([
      { userId: "u-1", displayName: "Usuario Fulbito", points: 18, rank: 1 }
    ]);

    const screen = renderAppNavigation();

    expect(screen.getByText("Iniciar sesión")).toBeTruthy();
    fireEvent.changeText(screen.getByPlaceholderText("Email"), "qa@example.com");
    fireEvent.changeText(screen.getByPlaceholderText("Contraseña"), "secret");
    fireEvent.press(screen.getByText("Entrar"));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith("qa@example.com", "secret");
    });

    screen.rerender(createNavigationTree());

    await waitFor(() => {
      expect(screen.getAllByText("Inicio").length).toBeGreaterThan(0);
      expect(screen.getByText("Próximos Partidos")).toBeTruthy();
    });
  });
});

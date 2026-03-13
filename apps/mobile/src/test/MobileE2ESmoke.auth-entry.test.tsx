import { fireEvent, waitFor } from "@testing-library/react-native";
import {
  createNavigationTree,
  DEFAULT_USER,
  mockedFixtureList,
  mockedLeaderboardGet,
  mockedLeaderboardPayloadGet,
  mockedProfileGet,
  mockedPredictionsList,
  mockedUseAuth,
  mockedUseGroupSelection,
  mockedUsePeriod,
  mockAuthState,
  mockGroupSelectionState,
  mockPeriodState,
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

    mockedUseAuth.mockImplementation(() =>
      mockAuthState({
        isAuthenticated,
        session: isAuthenticated
          ? {
              user: DEFAULT_USER,
              memberships: []
            }
          : null,
        login,
        logout
      })
    );

    mockedUseGroupSelection.mockReturnValue(mockGroupSelectionState());

    mockedUsePeriod.mockReturnValue(mockPeriodState());

    mockedFixtureList.mockResolvedValue([
      {
        id: "fx-arg-lan-upcoming",
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
    mockedLeaderboardPayloadGet.mockResolvedValue({
      groupLabel: "Grupo Amigos",
      mode: "stats",
      period: "global",
      periodLabel: "Global acumulado",
      updatedAt: "2026-03-08T00:00:00.000Z",
      rows: [],
      groupStats: null,
      stats: null
    });
    mockedProfileGet.mockResolvedValue({
      stats: { totalPoints: 0, accuracyPct: 0, groups: 0 },
      recentActivity: [],
      updatedAt: "2026-03-08T00:00:00.000Z"
    });

    const screen = renderAppNavigation();

    await waitFor(() => {
      expect(screen.getByText("Iniciar sesión")).toBeTruthy();
    });
    fireEvent.changeText(screen.getByPlaceholderText("Email"), "qa@example.com");
    fireEvent.changeText(screen.getByPlaceholderText("Contraseña"), "secret");
    fireEvent.press(screen.getByText("Entrar"));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith("qa@example.com", "secret");
    });

    screen.rerender(createNavigationTree());

    await waitFor(() => {
      expect(screen.getAllByText("Inicio").length).toBeGreaterThan(0);
    });
  });
});

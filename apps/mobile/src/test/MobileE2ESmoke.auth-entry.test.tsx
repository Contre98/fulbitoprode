import { fireEvent, waitFor } from "@testing-library/react-native";
import {
  createNavigationTree,
  DEFAULT_USER,
  mockedFixtureList,
  mockedLeaderboardGet,
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

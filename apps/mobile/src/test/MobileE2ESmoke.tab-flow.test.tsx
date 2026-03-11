import { fireEvent, waitFor } from "@testing-library/react-native";
import {
  mockAuthState,
  mockGroupSelectionState,
  mockPeriodState,
  mockedFixtureList,
  mockedLeaderboardGet,
  mockedLeaderboardPayloadGet,
  mockedPredictionsList,
  mockedPredictionsSave,
  mockedUseAuth,
  mockedUseGroupSelection,
  mockedUsePeriod,
  renderAppNavigation
} from "./mobileSmokeTestHarness";

describe("Mobile E2E smoke tab-flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("covers Inicio -> Pronosticos autosave flow", async () => {
    const setSelectedGroupId = jest.fn();

    mockedUseAuth.mockReturnValue(
      mockAuthState({})
    );

    mockedUseGroupSelection.mockReturnValue(
      mockGroupSelectionState({
        setSelectedGroupId
      })
    );

    mockedUsePeriod.mockReturnValue(
      mockPeriodState({
        options: [
          { id: 1, label: "Fecha 1" },
          { id: 2, label: "Fecha 2" }
        ]
      })
    );

    mockedFixtureList.mockResolvedValue([
      {
        id: "fx-arg-lan-upcoming",
        homeTeam: "Argentinos Juniors",
        awayTeam: "Lanus",
        kickoffAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: "upcoming"
      },
      {
        id: "fx-def-bel-final",
        homeTeam: "Defensa Y Justicia",
        awayTeam: "Belgrano Cordoba",
        kickoffAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: "final",
        score: {
          home: 1,
          away: 1
        }
      }
    ]);

    mockedPredictionsList.mockResolvedValue([]);
    mockedPredictionsSave.mockResolvedValue(undefined);
    mockedLeaderboardGet.mockResolvedValue([
      { userId: "u-1", displayName: "Usuario Fulbito", points: 18, rank: 1 }
    ]);
    mockedLeaderboardPayloadGet.mockResolvedValue({
      groupLabel: "Grupo Amigos",
      mode: "stats",
      period: "global",
      periodLabel: "Global acumulado",
      updatedAt: "2026-03-08T00:00:00.000Z",
      rows: [{ userId: "u-1", name: "Usuario Fulbito", rank: 1, predictions: 8, record: "6/2/0", points: 18 }],
      groupStats: null,
      stats: {
        summary: {
          memberCount: 1,
          scoredPredictions: 8,
          correctPredictions: 8,
          exactPredictions: 6,
          resultPredictions: 2,
          missPredictions: 0,
          accuracyPct: 100,
          totalPoints: 18,
          averageMemberPoints: 18,
          bestRound: null,
          worstRound: null,
          worldBenchmark: null
        },
        awards: [
          {
            id: "nostradamus",
            title: "NOSTRADAMUS",
            winnerName: "Usuario Fulbito",
            subtitle: "Mayor cantidad de plenos (6)"
          }
        ],
        historicalSeries: []
      }
    });

    const screen = renderAppNavigation();

    await waitFor(() => {
      expect(screen.getAllByText("Inicio").length).toBeGreaterThan(0);
      expect(screen.getByText("Próximos Partidos")).toBeTruthy();
    });

    fireEvent.press(screen.getAllByText("Posiciones")[0]);

    await waitFor(() => {
      expect(screen.getAllByText("Posiciones").length).toBeGreaterThan(0);
      expect(screen.getByText("Stats")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Stats"));

    await waitFor(() => {
      expect(screen.getAllByText("PREMIOS Y CASTIGOS").length).toBeGreaterThan(0);
    });

    fireEvent.press(screen.getAllByText("Posiciones")[0]);

    await waitFor(() => {
      expect(screen.getByText("PRED")).toBeTruthy();
    });

    fireEvent.press(screen.getAllByText("Pronósticos")[0]);

    await waitFor(() => {
      expect(screen.getByText("Por Jugar")).toBeTruthy();
      expect(screen.getByText("Jugados")).toBeTruthy();
    });

    const scoreInputs = screen.getAllByPlaceholderText("-");
    fireEvent.changeText(scoreInputs[0], "2");
    fireEvent.changeText(scoreInputs[1], "1");

    await waitFor(() => {
      expect(mockedPredictionsSave).toHaveBeenCalledWith({
        groupId: "g-1",
        fecha: 1,
        prediction: {
          fixtureId: "fx-arg-lan-upcoming",
          home: 2,
          away: 1
        }
      });
    }, { timeout: 2500 });
  });
});

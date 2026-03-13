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
        fecha: "1",
        options: [
          { id: "1", label: "Fecha 1" },
          { id: "2", label: "Fecha 2" }
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
        userSection: {
          userId: "u-1",
          userName: "Usuario Fulbito",
          precisionPct: 100,
          exactPct: 75,
          averagePointsPerRound: 9,
          trend: {
            accuracyPctDelta: 0,
            pointsPerRoundDelta: 0
          },
          consistencyStdDev: 0,
          nearMissRatePct: 12,
          homeAccuracyPct: 100,
          awayAccuracyPct: 100
        },
        groupSection: {
          precisionPct: 100,
          pointsDistribution: {
            p25: 9,
            median: 9,
            p75: 9
          },
          parityGapTopVsMedian: 0,
          difficultyIndexAvgPointsPerRound: 9,
          consensusHitPct: 100,
          advantageOpportunityCount: 0,
          activeParticipationPct: 100,
          bestRound: null,
          worstRound: null
        },
        comparatives: {
          vsMedianAccuracyPct: 0,
          vsMedianPointsPerRound: 0
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
    });

    fireEvent.press(screen.getAllByText("Posiciones")[0]);

    await waitFor(() => {
      expect(screen.getAllByText("Posiciones").length).toBeGreaterThan(0);
      expect(screen.getByText("Estadísticas")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Estadísticas"));

    await waitFor(() => {
      expect(screen.getAllByText("PREMIOS Y CASTIGOS").length).toBeGreaterThan(0);
    });

    fireEvent.press(screen.getAllByText("Posiciones")[0]);

    await waitFor(() => {
      expect(screen.getByText("P: pronósticos · E: exactos · R: resultado · N: sin acierto")).toBeTruthy();
    });

    fireEvent.press(screen.getAllByText("Pronósticos")[0]);

    await waitFor(() => {
      expect(screen.getByText("Por Jugar")).toBeTruthy();
      expect(screen.getByText("Jugados")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("score-open-fx-arg-lan-upcoming-home"));
    fireEvent.press(screen.getByTestId("score-wheel-home-inc"));
    fireEvent.press(screen.getByTestId("score-wheel-home-inc"));
    fireEvent.press(screen.getByTestId("score-wheel-away-inc"));
    fireEvent.press(screen.getByTestId("score-picker-apply"));

    await waitFor(() => {
      expect(mockedPredictionsSave).toHaveBeenCalledWith({
        groupId: "g-1",
        fecha: "1",
        prediction: {
          fixtureId: "fx-arg-lan-upcoming",
          home: 2,
          away: 1
        }
      });
    }, { timeout: 2500 });
  });
});

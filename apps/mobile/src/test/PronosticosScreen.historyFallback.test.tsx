import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { PronosticosScreen } from "@/screens/PronosticosScreen";
import { fixtureRepository, predictionsRepository } from "@/repositories";
import { useGroupSelection } from "@/state/GroupContext";
import { usePeriod } from "@/state/PeriodContext";

jest.mock("@/repositories", () => ({
  fixtureRepository: {
    listFixture: jest.fn()
  },
  predictionsRepository: {
    listPredictions: jest.fn(),
    savePrediction: jest.fn()
  }
}));

jest.mock("@/state/GroupContext", () => ({
  useGroupSelection: jest.fn()
}));

jest.mock("@/state/PeriodContext", () => ({
  usePeriod: jest.fn()
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 })
}));

jest.mock("@/components/HeaderGroupSelector", () => ({
  HeaderGroupSelector: () => null
}));

jest.mock("@/components/ScreenFrame", () => ({
  ScreenFrame: ({ children }: { children: ReactNode }) => children
}));

jest.mock("@/components/BrandBadgeIcon", () => ({
  BrandBadgeIcon: () => null
}));

jest.mock("@/components/TeamCrest", () => ({
  TeamCrest: () => null
}));

const mockedFixtureList = fixtureRepository.listFixture as unknown as jest.Mock;
const mockedPredictionsList = predictionsRepository.listPredictions as unknown as jest.Mock;
const mockedUseGroupSelection = useGroupSelection as unknown as jest.Mock;
const mockedUsePeriod = usePeriod as unknown as jest.Mock;

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={client}>
      <PronosticosScreen />
    </QueryClientProvider>
  );
}

describe("PronosticosScreen history fallback", () => {
  beforeEach(() => {
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
      fecha: "2026-03",
      options: [{ id: "2026-03", label: "Fecha 3" }],
      setFecha: jest.fn()
    });

    mockedPredictionsList.mockResolvedValue([
      {
        fixtureId: "fx-upcoming-only",
        home: 1,
        away: 1
      }
    ]);
    mockedFixtureList.mockResolvedValue([
      {
        id: "fx-upcoming-only",
        homeTeam: "River Plate",
        awayTeam: "San Lorenzo",
        kickoffAt: "2099-03-20T20:00:00.000Z",
        status: "upcoming"
      }
    ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("keeps Jugados empty when selected fecha has only upcoming matches", async () => {
    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Por Jugar")).toBeTruthy();
      expect(screen.getByText("RIV")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Jugados"));

    await waitFor(() => {
      expect(screen.getByText("Sin partidos finalizados")).toBeTruthy();
    });

    expect(mockedFixtureList).toHaveBeenCalledWith({
      groupId: "g-1",
      fecha: "2026-03"
    });
    expect(mockedFixtureList).not.toHaveBeenCalledWith({
      groupId: "g-1",
      fecha: ""
    });
  });

  it("defaults to Jugados when selected fecha is fully in the past", async () => {
    mockedPredictionsList.mockResolvedValue([
      {
        fixtureId: "fx-final-default-history",
        home: 2,
        away: 0
      }
    ]);
    mockedFixtureList.mockResolvedValue([
      {
        id: "fx-final-default-history",
        homeTeam: "Lanus",
        awayTeam: "Instituto",
        kickoffAt: "2026-02-20T20:00:00.000Z",
        status: "final",
        score: {
          home: 1,
          away: 1
        }
      }
    ]);

    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Tu pronóstico: 2 - 0")).toBeTruthy();
      expect(screen.getByText("Puntos: 0")).toBeTruthy();
    });
  });

  it("keeps actual result pending when final score is missing instead of falling back to user prediction", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    mockedPredictionsList.mockResolvedValue([
      {
        fixtureId: "fx-final-without-score",
        home: 3,
        away: 2
      }
    ]);
    mockedFixtureList.mockResolvedValue([
      {
        id: "fx-final-without-score",
        homeTeam: "Newells",
        awayTeam: "Banfield",
        kickoffAt: "2026-03-01T22:00:00.000Z",
        status: "final"
      }
    ]);

    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Por Jugar")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Jugados"));

    await waitFor(() => {
      expect(screen.getByText("Tu pronóstico: 3 - 2")).toBeTruthy();
      expect(screen.getByText("Puntos: Pendiente")).toBeTruthy();
    });
    expect(errorSpy).toHaveBeenCalledWith(
      "[pronosticos] final fixtures missing actual result score",
      expect.objectContaining({
        fixtureIds: ["fx-final-without-score"],
        count: 1
      })
    );
    errorSpy.mockRestore();
  });

  it("falls back to another period only when selected period returns no fixtures", async () => {
    mockedUsePeriod.mockReturnValue({
      fecha: "2026-09",
      options: [
        { id: "2026-09", label: "Fecha 9" },
        { id: "2026-08", label: "Fecha 8" }
      ],
      setFecha: jest.fn()
    });

    mockedPredictionsList.mockResolvedValue([
      {
        fixtureId: "fx-fallback-final",
        home: 0,
        away: 1
      }
    ]);

    mockedFixtureList.mockImplementation(async (input: { fecha: string }) => {
      if (input.fecha === "2026-09") {
        return [];
      }
      if (input.fecha === "2026-08") {
        return [
          {
            id: "fx-fallback-final",
            homeTeam: "Defensa y Justicia",
            awayTeam: "Belgrano Cordoba",
            kickoffAt: "2026-03-01T22:00:00.000Z",
            status: "final",
            score: {
              home: 2,
              away: 1
            }
          }
        ];
      }

      return [];
    });

    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Por Jugar")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Jugados"));

    await waitFor(() => {
      expect(screen.getByText("DEF")).toBeTruthy();
      expect(screen.getByText("BEL")).toBeTruthy();
      expect(screen.getByText("2 - 1")).toBeTruthy();
      expect(screen.getByText("Puntos: 0")).toBeTruthy();
    });

    expect(mockedFixtureList).toHaveBeenCalledWith({
      groupId: "g-1",
      fecha: "2026-09"
    });
    expect(mockedFixtureList).toHaveBeenCalledWith({ groupId: "g-1", fecha: "2026-08" });
  });
});

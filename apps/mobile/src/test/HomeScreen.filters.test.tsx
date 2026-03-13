import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HomeScreen } from "@/screens/HomeScreen";
import { fixtureRepository, leaderboardRepository, predictionsRepository } from "@/repositories";
import { useAuth } from "@/state/AuthContext";
import { useGroupSelection } from "@/state/GroupContext";
import { usePeriod } from "@/state/PeriodContext";

jest.mock("@/repositories", () => ({
  fixtureRepository: {
    listFixture: jest.fn()
  },
  predictionsRepository: {
    listPredictions: jest.fn()
  },
  leaderboardRepository: {
    getLeaderboardPayload: jest.fn()
  }
}));

jest.mock("@/state/AuthContext", () => ({
  useAuth: jest.fn()
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

const mockedFixtureList = fixtureRepository.listFixture as unknown as jest.Mock;
const mockedPredictionsList = predictionsRepository.listPredictions as unknown as jest.Mock;
const mockedLeaderboard = leaderboardRepository.getLeaderboardPayload as unknown as jest.Mock;
const mockedUseAuth = useAuth as unknown as jest.Mock;
const mockedUseGroupSelection = useGroupSelection as unknown as jest.Mock;
const mockedUsePeriod = usePeriod as unknown as jest.Mock;
const mockedSetSelectedGroupId = jest.fn();
const mockedSetFecha = jest.fn();
type HomeFixtureStatus = "upcoming" | "live" | "final";

function buildFixture(id: string, status: HomeFixtureStatus, homeTeam: string, awayTeam: string) {
  const now = Date.now();
  const kickoffByStatus =
    status === "upcoming"
      ? new Date(now + 60 * 60 * 1000).toISOString()
      : status === "live"
        ? new Date(now - 20 * 60 * 1000).toISOString()
        : new Date(now - 2 * 60 * 60 * 1000).toISOString();

  return {
    id,
    dateKey: "2026-03-03",
    homeTeam,
    awayTeam,
    kickoffAt: kickoffByStatus,
    status
  };
}

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={client}>
      <HomeScreen />
    </QueryClientProvider>
  );
}

describe("HomeScreen filters", () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      session: {
        user: { id: "u-1", email: "test@example.com", name: "Usuario Test" },
        memberships: []
      }
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
      setSelectedGroupId: mockedSetSelectedGroupId
    });

    mockedUsePeriod.mockReturnValue({
      fecha: "2026-09",
      defaultFecha: "2026-08",
      setFecha: mockedSetFecha,
      options: [
        { id: "2026-09", label: "Fecha 9" },
        { id: "2026-08", label: "Fecha 8" },
        { id: "2026-07", label: "Fecha 7" }
      ]
    });

    mockedLeaderboard.mockResolvedValue({
      groupLabel: "Grupo Amigos",
      mode: "posiciones",
      period: "global",
      periodLabel: "Global",
      updatedAt: new Date().toISOString(),
      rows: [
        {
          userId: "u-1",
          userName: "Usuario Test",
          rank: 1,
          points: 18,
          exact: 9,
          diff: 3,
          tendency: 15,
          highlight: true
        }
      ],
      groupStats: null,
      stats: null
    });

    mockedPredictionsList.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("does not render inline group cards in Inicio", async () => {
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
        },
        {
          groupId: "g-2",
          groupName: "Grupo Oficina",
          leagueId: 128,
          leagueName: "Liga Profesional",
          competitionStage: "apertura",
          season: "2026",
          role: "member",
          joinedAt: "2026-01-01T00:00:00.000Z"
        },
        {
          groupId: "g-3",
          groupName: "Grupo Familia",
          leagueId: 128,
          leagueName: "Liga Profesional",
          competitionStage: "apertura",
          season: "2026",
          role: "member",
          joinedAt: "2026-01-01T00:00:00.000Z"
        }
      ],
      selectedGroupId: "g-1",
      setSelectedGroupId: mockedSetSelectedGroupId
    });
    mockedFixtureList.mockResolvedValue([buildFixture("f-1", "upcoming", "River Plate", "San Lorenzo")]);

    const screen = renderScreen();
    await waitFor(() => {
      expect(screen.getByText("RANKING")).toBeTruthy();
    });

    expect(screen.queryByText("Grupo Oficina")).toBeNull();
    expect(screen.queryByText("Grupo Familia")).toBeNull();
    expect(mockedSetSelectedGroupId).not.toHaveBeenCalled();
  });

  it("uses current/upcoming default fecha for Inicio cards even when another fecha is selected elsewhere", async () => {
    mockedFixtureList.mockResolvedValue([buildFixture("f-upcoming", "upcoming", "River Plate", "San Lorenzo")]);

    const screen = renderScreen();

    await waitFor(() => {
      expect(mockedFixtureList).toHaveBeenCalledWith({
        groupId: "g-1",
        fecha: "2026-08"
      });
      expect(mockedPredictionsList).toHaveBeenCalledWith({
        groupId: "g-1",
        fecha: "2026-08"
      });
      expect(screen.getByText("River Plate")).toBeTruthy();
    });
  });

  it("renders upcoming/live matches by default and filters with tabs", async () => {
    mockedFixtureList.mockResolvedValue([
      buildFixture("f-1", "final", "Boca Juniors", "Racing Club"),
      buildFixture("f-2", "live", "Lanus", "Banfield"),
      buildFixture("f-3", "upcoming", "River Plate", "San Lorenzo")
    ]);

    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Lanus")).toBeTruthy();
      expect(screen.getByText("River Plate")).toBeTruthy();
      expect(screen.queryByText("Boca Juniors")).toBeNull();
    });

    fireEvent.press(screen.getByText("En vivo"));

    await waitFor(() => {
      expect(screen.getByText("Lanus")).toBeTruthy();
      expect(screen.queryByText("Boca Juniors")).toBeNull();
      expect(screen.queryByText("River Plate")).toBeNull();
    });

    fireEvent.press(screen.getByText("Próximos"));

    await waitFor(() => {
      expect(screen.getByText("River Plate")).toBeTruthy();
      expect(screen.queryByText("Boca Juniors")).toBeNull();
      expect(screen.queryByText("Lanus")).toBeNull();
    });
  });

  it("shows empty-state message when selected filter has no fixtures", async () => {
    mockedFixtureList.mockResolvedValue([
      buildFixture("f-1", "final", "Defensa Y Justicia", "Belgrano Cordoba")
    ]);

    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Sin partidos")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("En vivo"));

    await waitFor(() => {
      expect(screen.getByText("No hay partidos en vivo para este grupo y fecha.")).toBeTruthy();
    });
  });
});

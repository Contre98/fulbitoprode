import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HomeScreen } from "@/screens/HomeScreen";
import { fixtureRepository, leaderboardRepository } from "@/repositories";
import { useAuth } from "@/state/AuthContext";
import { useGroupSelection } from "@/state/GroupContext";
import { usePeriod } from "@/state/PeriodContext";

jest.mock("@/repositories", () => ({
  fixtureRepository: {
    listFixture: jest.fn()
  },
  leaderboardRepository: {
    getLeaderboard: jest.fn()
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

const mockedFixtureList = fixtureRepository.listFixture as unknown as jest.Mock;
const mockedLeaderboard = leaderboardRepository.getLeaderboard as unknown as jest.Mock;
const mockedUseAuth = useAuth as unknown as jest.Mock;
const mockedUseGroupSelection = useGroupSelection as unknown as jest.Mock;
const mockedUsePeriod = usePeriod as unknown as jest.Mock;
type HomeFixtureStatus = "upcoming" | "live" | "final";

function buildFixture(id: string, status: HomeFixtureStatus, homeTeam: string, awayTeam: string) {
  return {
    id,
    dateKey: "2026-03-03",
    homeTeam,
    awayTeam,
    kickoffAt: "2026-03-03T21:00:00.000Z",
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
      setSelectedGroupId: jest.fn()
    });

    mockedUsePeriod.mockReturnValue({
      fecha: 3,
      setFecha: jest.fn(),
      availableFechas: [1, 2, 3],
      loading: false,
      error: null
    });

    mockedLeaderboard.mockResolvedValue([
      {
        userId: "u-1",
        userName: "Usuario Test",
        rank: 1,
        points: 18,
        exact: 9,
        diff: 3,
        tendency: 15
      }
    ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders all matches by default and filters with tabs", async () => {
    mockedFixtureList.mockResolvedValue([
      buildFixture("f-1", "final", "Boca Juniors", "Racing Club"),
      buildFixture("f-2", "live", "Lanus", "Banfield"),
      buildFixture("f-3", "upcoming", "River Plate", "San Lorenzo")
    ]);

    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Boca Juniors")).toBeTruthy();
      expect(screen.getByText("Lanus")).toBeTruthy();
      expect(screen.getByText("River Plate")).toBeTruthy();
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
      expect(screen.getByText("Defensa Y Justicia")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("En vivo"));

    await waitFor(() => {
      expect(screen.getByText("No hay partidos en vivo para este grupo y fecha.")).toBeTruthy();
    });
  });
});

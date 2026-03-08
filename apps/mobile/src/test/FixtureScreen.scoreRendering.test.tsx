import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FixtureScreen } from "@/screens/FixtureScreen";
import { fixtureRepository } from "@/repositories";
import { useGroupSelection } from "@/state/GroupContext";
import { usePeriod } from "@/state/PeriodContext";

jest.mock("@/repositories", () => ({
  fixtureRepository: {
    listFixture: jest.fn()
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

jest.mock("@/components/DataModeBadge", () => ({
  DataModeBadge: () => null
}));

const mockedFixtureList = fixtureRepository.listFixture as unknown as jest.Mock;
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
      <FixtureScreen />
    </QueryClientProvider>
  );
}

describe("FixtureScreen score rendering", () => {
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders final score from fixture.score when fixture id has no encoded score", async () => {
    mockedFixtureList.mockResolvedValue([
      {
        id: "fx-def-bel-final",
        homeTeam: "Defensa Y Justicia",
        awayTeam: "Belgrano Cordoba",
        kickoffAt: "2026-03-06T22:00:00.000Z",
        status: "final",
        score: {
          home: 3,
          away: 2
        }
      }
    ]);

    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Defensa Y Justicia")).toBeTruthy();
      expect(screen.getByText("Belgrano Cordoba")).toBeTruthy();
      expect(screen.getByText("3-2")).toBeTruthy();
      expect(screen.getByText("FINAL")).toBeTruthy();
    });

    expect(mockedFixtureList).toHaveBeenCalledWith({
      groupId: "g-1",
      fecha: "2026-03"
    });
  });

  it("does not infer score from fixture id when fixture.score is missing", async () => {
    mockedFixtureList.mockResolvedValue([
      {
        id: "fx-boc-rac-final-4-3",
        homeTeam: "Boca Juniors",
        awayTeam: "Racing Club",
        kickoffAt: "2026-03-06T22:00:00.000Z",
        status: "final"
      }
    ]);

    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Boca Juniors")).toBeTruthy();
      expect(screen.getByText("Racing Club")).toBeTruthy();
      expect(screen.getByText("--")).toBeTruthy();
      expect(screen.getByText("FINAL")).toBeTruthy();
    });

    expect(screen.queryByText("4-3")).toBeNull();
  });

  it("renders backend live/final scores and keeps filters consistent across states", async () => {
    mockedFixtureList.mockResolvedValue([
      {
        id: "fx-live-aj-lan",
        homeTeam: "Argentinos Juniors",
        awayTeam: "Lanus",
        kickoffAt: "2026-03-06T22:00:00.000Z",
        status: "live",
        score: {
          home: 1,
          away: 0
        }
      },
      {
        id: "fx-final-boc-rac",
        homeTeam: "Boca Juniors",
        awayTeam: "Racing Club",
        kickoffAt: "2026-03-06T20:00:00.000Z",
        status: "final",
        score: {
          home: 2,
          away: 2
        }
      },
      {
        id: "fx-upcoming-riv-slo",
        homeTeam: "River Plate",
        awayTeam: "San Lorenzo",
        kickoffAt: "2026-03-07T23:30:00.000Z",
        status: "upcoming"
      }
    ]);

    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByText("1-0")).toBeTruthy();
      expect(screen.getByText("2-2")).toBeTruthy();
      expect(screen.getByText("vs")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Finalizados"));
    await waitFor(() => {
      expect(screen.getByText("2-2")).toBeTruthy();
      expect(screen.queryByText("Argentinos Juniors")).toBeNull();
      expect(screen.queryByText("River Plate")).toBeNull();
    });

    fireEvent.press(screen.getByText("Próximos"));
    await waitFor(() => {
      expect(screen.getByText("River Plate")).toBeTruthy();
      expect(screen.getByText("San Lorenzo")).toBeTruthy();
      expect(screen.getByText("vs")).toBeTruthy();
      expect(screen.queryByText("2-2")).toBeNull();
    });

    fireEvent.press(screen.getByText("En vivo"));
    await waitFor(() => {
      expect(screen.getByText("Argentinos Juniors")).toBeTruthy();
      expect(screen.getByText("Lanus")).toBeTruthy();
      expect(screen.getByText("1-0")).toBeTruthy();
      expect(screen.queryByText("Boca Juniors")).toBeNull();
      expect(screen.queryByText("River Plate")).toBeNull();
    });
  });
});

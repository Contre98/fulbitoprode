import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/leaderboard/route";

const mockUserId: string | null = "u1";
const mockPbToken: string | null = "pb-token";
const listGroupsForUserMock = vi.fn();
const listGroupMembersMock = vi.fn();
const listGroupPredictionsMock = vi.fn();
const fetchAvailableFechasMock = vi.fn().mockResolvedValue(["Fecha 1"]);
const fetchLigaArgentinaFixturesMock = vi.fn().mockResolvedValue([]);
const formatRoundLabelMock = vi.fn((input: string) => input);
const mapFixturesToPronosticosMatchesMock = vi.fn().mockReturnValue([]);
const fetchLigaArgentinaStandingsMock = vi.fn().mockResolvedValue(null);

vi.mock("@/lib/request-auth", () => ({
  getSessionUserIdFromRequest: () => mockUserId,
  getSessionPocketBaseTokenFromRequest: () => mockPbToken
}));

vi.mock("@/lib/m3-repo", () => ({
  listGroupsForUser: (...args: unknown[]) => listGroupsForUserMock(...args),
  listGroupMembers: (...args: unknown[]) => listGroupMembersMock(...args),
  listGroupPredictions: (...args: unknown[]) => listGroupPredictionsMock(...args)
}));

vi.mock("@/lib/liga-live-provider", () => ({
  fetchAvailableFechas: (input: unknown) => fetchAvailableFechasMock(input),
  fetchLigaArgentinaFixtures: (input: unknown) => fetchLigaArgentinaFixturesMock(input),
  formatRoundLabel: (input: string) => formatRoundLabelMock(input),
  mapFixturesToPronosticosMatches: (input: unknown) => mapFixturesToPronosticosMatchesMock(input),
  fetchLigaArgentinaStandings: (input: unknown) => fetchLigaArgentinaStandingsMock(input)
}));

describe("GET /api/leaderboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchAvailableFechasMock.mockResolvedValue(["Fecha 1"]);
    fetchLigaArgentinaFixturesMock.mockResolvedValue([]);
    formatRoundLabelMock.mockImplementation((input: string) => input);
    mapFixturesToPronosticosMatchesMock.mockReturnValue([]);
    fetchLigaArgentinaStandingsMock.mockResolvedValue(null);
  });

  it("returns group stats payload for stats mode", async () => {
    fetchAvailableFechasMock.mockResolvedValueOnce(["Fecha 1", "Fecha 2"]);
    fetchLigaArgentinaFixturesMock.mockImplementation(async ({ period }: { period: string }) => [{ id: `fixture-${period}` }]);
    mapFixturesToPronosticosMatchesMock.mockImplementation((fixtures: Array<{ id: string }>) =>
      fixtures.map((fixture) => {
        const score = fixture.id === "fixture-Fecha 1" ? { home: 1, away: 0 } : { home: 2, away: 2 };
        return {
          id: fixture.id,
          status: "final",
          homeTeam: { code: "A" },
          awayTeam: { code: "B" },
          meta: { label: "FINALIZADO" },
          score
        };
      })
    );
    fetchLigaArgentinaStandingsMock.mockResolvedValueOnce({
      leagueName: "Liga Test",
      groupLabel: "Tabla",
      rows: [{ rank: 1, teamName: "Lider", played: 10, win: 8, draw: 2, lose: 0, points: 50, group: "General" }]
    });

    listGroupsForUserMock.mockResolvedValueOnce([
      {
        group: {
          id: "g1",
          name: "Grupo",
          leagueId: 128,
          season: "2026",
          competitionStage: "apertura"
        }
      }
    ]);
    listGroupMembersMock.mockResolvedValueOnce([{ userId: "u1", name: "Ana" }]);
    listGroupPredictionsMock.mockResolvedValueOnce([
      { userId: "u1", fixtureId: "fixture-Fecha 1", period: "Fecha 1", home: 1, away: 0 },
      { userId: "u1", fixtureId: "fixture-Fecha 2", period: "Fecha 2", home: 0, away: 0 }
    ]);

    const response = await GET(new Request("http://localhost/api/leaderboard?groupId=g1&mode=stats&period=global"));
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { groupStats?: { memberCount: number; bestFecha: { period: string; userName: string; points: number } } };
    expect(payload.groupStats?.memberCount).toBe(1);
    expect(payload.groupStats?.bestFecha.period).toBe("Fecha 1");
    expect(payload.groupStats?.bestFecha.userName).toBe("Ana");
    expect(payload.groupStats?.bestFecha.points).toBe(3);
  });

  it("maps PocketBase 403 to permission guidance response", async () => {
    listGroupsForUserMock.mockResolvedValueOnce([
      {
        group: {
          id: "g1",
          name: "Grupo",
          leagueId: 128,
          season: "2026",
          competitionStage: "apertura"
        }
      }
    ]);
    listGroupMembersMock.mockResolvedValueOnce([]);
    listGroupPredictionsMock.mockRejectedValueOnce(new Error("PocketBase 403: blocked"));

    const response = await GET(new Request("http://localhost/api/leaderboard?groupId=g1"));
    expect(response.status).toBe(409);
  });
});

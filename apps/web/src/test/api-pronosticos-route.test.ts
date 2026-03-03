import { describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/pronosticos/route";

const mockUserId: string | null = "u1";
const mockPbToken: string | null = "pb-token";
const isActiveGroupMemberMock = vi.fn();
const listGroupsForUserMock = vi.fn();
const upsertPredictionMock = vi.fn();
const fetchFixturesMock = vi.fn();
const mapMatchesMock = vi.fn();

vi.mock("@/lib/request-auth", () => ({
  getSessionUserIdFromRequest: () => mockUserId,
  getSessionPocketBaseTokenFromRequest: () => mockPbToken
}));

vi.mock("@/lib/m3-repo", () => ({
  isActiveGroupMember: (...args: unknown[]) => isActiveGroupMemberMock(...args),
  listGroupsForUser: (...args: unknown[]) => listGroupsForUserMock(...args),
  listPredictionsForScope: vi.fn(),
  upsertPrediction: (...args: unknown[]) => upsertPredictionMock(...args)
}));

vi.mock("@/lib/liga-live-provider", () => ({
  fetchAvailableFechas: vi.fn(),
  fetchLigaArgentinaFixtures: (...args: unknown[]) => fetchFixturesMock(...args),
  formatRoundLabel: vi.fn((input: string) => input),
  mapFixturesToPronosticosMatches: (...args: unknown[]) => mapMatchesMock(...args),
  resolveDefaultFecha: vi.fn()
}));

describe("POST /api/pronosticos", () => {
  it("returns forbidden for non-members", async () => {
    isActiveGroupMemberMock.mockResolvedValueOnce(false);

    const response = await POST(
      new Request("http://localhost/api/pronosticos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ groupId: "g1", period: "Fecha 1", matchId: "m1", home: 1, away: 0 })
      })
    );

    expect(response.status).toBe(403);
    expect(upsertPredictionMock).not.toHaveBeenCalled();
  });

  it("rejects non-upcoming match predictions", async () => {
    isActiveGroupMemberMock.mockResolvedValueOnce(true);
    listGroupsForUserMock.mockResolvedValueOnce([
      {
        group: {
          id: "g1",
          leagueId: 128,
          season: "2026",
          competitionStage: "apertura"
        }
      }
    ]);
    fetchFixturesMock.mockResolvedValueOnce([]);
    mapMatchesMock.mockReturnValueOnce([
      {
        id: "m1",
        status: "final",
        homeTeam: { code: "RIV" },
        awayTeam: { code: "BOC" },
        meta: { label: "FINALIZADO" }
      }
    ]);

    const response = await POST(
      new Request("http://localhost/api/pronosticos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ groupId: "g1", period: "Fecha 1", matchId: "m1", home: 1, away: 0 })
      })
    );

    expect(response.status).toBe(400);
    expect(upsertPredictionMock).not.toHaveBeenCalled();
  });
});

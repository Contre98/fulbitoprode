import { describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/leaderboard/route";

const mockUserId: string | null = "u1";
const mockPbToken: string | null = "pb-token";
const listGroupsForUserMock = vi.fn();
const listGroupMembersMock = vi.fn();
const listGroupPredictionsMock = vi.fn();

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
  fetchAvailableFechas: vi.fn(async () => ["Fecha 1"]),
  fetchLigaArgentinaFixtures: vi.fn(async () => []),
  formatRoundLabel: vi.fn((input: string) => input),
  mapFixturesToPronosticosMatches: vi.fn(() => [])
}));

describe("GET /api/leaderboard", () => {
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

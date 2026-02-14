import { describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/groups/route";

let mockUserId: string | null = "u1";
let mockPbToken: string | null = "pb-token";
const createGroupMock = vi.fn();

vi.mock("@/lib/request-auth", () => ({
  getSessionUserIdFromRequest: () => mockUserId,
  getSessionPocketBaseTokenFromRequest: () => mockPbToken
}));

vi.mock("@/lib/m3-repo", () => ({
  createGroup: (...args: unknown[]) => createGroupMock(...args),
  listGroupsForUser: vi.fn()
}));

describe("POST /api/groups", () => {
  it("returns created group with invite payload", async () => {
    createGroupMock.mockResolvedValueOnce({
      group: {
        id: "g1",
        name: "Grupo Amigos",
        slug: "grupo-amigos",
        season: "2026",
        leagueId: 128,
        competitionStage: "apertura",
        competitionName: "Apertura",
        competitionKey: "128-2026-apertura"
      },
      membership: { role: "owner" },
      invite: {
        code: "ABC12345",
        token: "token-value",
        expiresAt: "2026-01-01T00:00:00.000Z"
      }
    });

    const response = await POST(
      new Request("http://localhost/api/groups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Grupo Amigos", season: "2026", leagueId: 128 })
      })
    );

    expect(response.status).toBe(201);
    const payload = (await response.json()) as { invite?: { code?: string; token?: string } };
    expect(payload.invite?.code).toBe("ABC12345");
    expect(payload.invite?.token).toBe("token-value");
  });

  it("returns unauthorized when session is missing", async () => {
    mockUserId = null;
    mockPbToken = null;

    const response = await POST(
      new Request("http://localhost/api/groups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Grupo Amigos" })
      })
    );

    expect(response.status).toBe(401);

    mockUserId = "u1";
    mockPbToken = "pb-token";
  });
});

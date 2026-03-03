import { describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/groups/[groupId]/invite/route";
import { POST } from "@/app/api/groups/[groupId]/invite/refresh/route";

const mockUserId: string | null = "u1";
const mockPbToken: string | null = "pb-token";
const getGroupInviteMock = vi.fn();
const refreshGroupInviteMock = vi.fn();

vi.mock("@/lib/request-auth", () => ({
  getSessionUserIdFromRequest: () => mockUserId,
  getSessionPocketBaseTokenFromRequest: () => mockPbToken
}));

vi.mock("@/lib/m3-repo", () => ({
  getGroupInvite: (...args: unknown[]) => getGroupInviteMock(...args),
  refreshGroupInvite: (...args: unknown[]) => refreshGroupInviteMock(...args)
}));

describe("group invite routes", () => {
  it("returns invite payload for active member", async () => {
    getGroupInviteMock.mockResolvedValueOnce({
      ok: true,
      canRefresh: true,
      invite: {
        code: "ABC12345",
        token: "token-value",
        expiresAt: "2026-01-01T00:00:00.000Z"
      }
    });

    const response = await GET(new Request("http://localhost/api/groups/g1/invite"), {
      params: Promise.resolve({ groupId: "g1" })
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { canRefresh?: boolean; invite?: { code?: string } };
    expect(payload.canRefresh).toBe(true);
    expect(payload.invite?.code).toBe("ABC12345");
  });

  it("returns forbidden on refresh when role is not admin/owner", async () => {
    refreshGroupInviteMock.mockResolvedValueOnce({
      ok: false,
      error: "No tenés permisos para generar invitaciones."
    });

    const response = await POST(new Request("http://localhost/api/groups/g1/invite/refresh", { method: "POST" }), {
      params: Promise.resolve({ groupId: "g1" })
    });

    expect(response.status).toBe(403);
  });
});

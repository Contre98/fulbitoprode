import { describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/groups/leave/route";

let mockUserId: string | null = "u1";
let mockPbToken: string | null = "pb-token";
const leaveGroupMock = vi.fn();

vi.mock("@/lib/request-auth", () => ({
  getSessionUserIdFromRequest: () => mockUserId,
  getSessionPocketBaseTokenFromRequest: () => mockPbToken
}));

vi.mock("@/lib/m3-repo", () => ({
  leaveGroup: (...args: unknown[]) => leaveGroupMock(...args)
}));

describe("POST /api/groups/leave", () => {
  it("returns deletedGroup=true when owner leaves as only owner", async () => {
    leaveGroupMock.mockResolvedValueOnce({ ok: true, deletedGroup: true });

    const response = await POST(
      new Request("http://localhost/api/groups/leave", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ groupId: "g1" })
      })
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { deletedGroup?: boolean };
    expect(payload.deletedGroup).toBe(true);
  });

  it("returns unauthorized when session is missing", async () => {
    mockUserId = null;
    mockPbToken = null;

    const response = await POST(
      new Request("http://localhost/api/groups/leave", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ groupId: "g1" })
      })
    );

    expect(response.status).toBe(401);

    mockUserId = "u1";
    mockPbToken = "pb-token";
  });

  it("surfaces PocketBase rule errors instead of invalid payload", async () => {
    leaveGroupMock.mockRejectedValueOnce(
      new Error('PocketBase 403: {"code":403,"message":"Only admins can manage this resource."}')
    );

    const response = await POST(
      new Request("http://localhost/api/groups/leave", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ groupId: "g1" })
      })
    );

    expect(response.status).toBe(403);
    const payload = (await response.json()) as { error?: string };
    expect(payload.error).toContain("Only admins can manage this resource.");
  });

  it("returns a clearer hint when PocketBase responds with generic processing error", async () => {
    leaveGroupMock.mockRejectedValueOnce(
      new Error('PocketBase 400: {"code":400,"message":"Something went wrong while processing your request.","data":{}}')
    );

    const response = await POST(
      new Request("http://localhost/api/groups/leave", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ groupId: "g1" })
      })
    );

    expect(response.status).toBe(400);
    const payload = (await response.json()) as { error?: string };
    expect(payload.error).toContain("PocketBase rechazó la operación");
  });
});

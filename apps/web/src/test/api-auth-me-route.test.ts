import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PATCH } from "@/app/api/auth/me/route";

let mockUserId: string | null = "u1";
let mockPbToken: string | null = "pb-token";
const getUserByIdMock = vi.fn();
const listGroupsForUserMock = vi.fn();
const updateUserProfileMock = vi.fn();

vi.mock("@/lib/request-auth", () => ({
  getSessionUserIdFromRequest: () => mockUserId,
  getSessionPocketBaseTokenFromRequest: () => mockPbToken
}));

vi.mock("@/lib/m3-repo", () => ({
  getUserById: (...args: unknown[]) => getUserByIdMock(...args),
  listGroupsForUser: (...args: unknown[]) => listGroupsForUserMock(...args),
  updateUserProfile: (...args: unknown[]) => updateUserProfileMock(...args)
}));

vi.mock("@/lib/liga-live-provider", () => ({
  fetchProviderLeagues: vi.fn().mockResolvedValue([])
}));

describe("auth me route", () => {
  beforeEach(() => {
    mockUserId = "u1";
    mockPbToken = "pb-token";
    vi.clearAllMocks();
  });

  it("returns username in GET session payload", async () => {
    getUserByIdMock.mockResolvedValueOnce({
      id: "u1",
      email: "facu@example.com",
      name: "Facundo",
      username: "facucontreras",
      favoriteTeam: "Boca"
    });
    listGroupsForUserMock.mockResolvedValueOnce([]);

    const response = await GET(new Request("http://localhost/api/auth/me"));
    expect(response.status).toBe(200);

    const payload = (await response.json()) as {
      user: { username?: string | null };
      memberships: unknown[];
    };
    expect(payload.user.username).toBe("facucontreras");
    expect(payload.memberships).toEqual([]);
  });

  it("patches editable identity fields", async () => {
    updateUserProfileMock.mockResolvedValueOnce({
      id: "u1",
      email: "nuevo@example.com",
      name: "Facundo Contreras",
      username: "facucontreras",
      favoriteTeam: null
    });

    const response = await PATCH(
      new Request("http://localhost/api/auth/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Facundo Contreras",
          username: "@facucontreras",
          email: "NUEVO@EXAMPLE.COM"
        })
      })
    );

    expect(response.status).toBe(200);
    expect(updateUserProfileMock).toHaveBeenCalledWith(
      "u1",
      {
        name: "Facundo Contreras",
        username: "facucontreras",
        email: "nuevo@example.com",
        favoriteTeam: undefined
      },
      "pb-token"
    );

    const payload = (await response.json()) as {
      user: { email: string; username?: string | null };
    };
    expect(payload.user.email).toBe("nuevo@example.com");
    expect(payload.user.username).toBe("facucontreras");
  });

  it("rejects invalid username values", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/auth/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: "usuario con espacios"
        })
      })
    );

    expect(response.status).toBe(400);
    const payload = (await response.json()) as { error?: string };
    expect(payload.error).toContain("Username can only include");
    expect(updateUserProfileMock).not.toHaveBeenCalled();
  });

  it("rejects invalid email values", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/auth/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "no-es-un-email"
        })
      })
    );

    expect(response.status).toBe(400);
    const payload = (await response.json()) as { error?: string };
    expect(payload.error).toBe("Email is invalid");
    expect(updateUserProfileMock).not.toHaveBeenCalled();
  });
});

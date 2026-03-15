import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@fulbito/server-core/request-auth", () => ({
  getSessionUserIdFromRequest: vi.fn(),
  getSessionPocketBaseTokenFromRequest: vi.fn()
}));

vi.mock("@fulbito/server-core/liga-live-provider", () => ({
  fetchProviderLeagues: vi.fn()
}));

vi.mock("@fulbito/server-core/m3-repo", () => ({
  getUserById: vi.fn(),
  listGroupsForUser: vi.fn(),
  updateUserProfile: vi.fn(),
  updateUserPassword: vi.fn(),
  deleteUserAccount: vi.fn()
}));

import { deleteUserAccount, updateUserPassword } from "@fulbito/server-core/m3-repo";
import { getSessionPocketBaseTokenFromRequest, getSessionUserIdFromRequest } from "@fulbito/server-core/request-auth";
import { DELETE, POST } from "../routes/auth/me/route";

describe("POST/DELETE /api/auth/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when missing auth context", async () => {
    vi.mocked(getSessionUserIdFromRequest).mockReturnValue(null);
    vi.mocked(getSessionPocketBaseTokenFromRequest).mockReturnValue(null);

    const response = await POST(
      new Request("http://localhost/api/auth/me", {
        method: "POST",
        body: JSON.stringify({ password: "super-secret" })
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns 400 when password is too short", async () => {
    vi.mocked(getSessionUserIdFromRequest).mockReturnValue("user-1");
    vi.mocked(getSessionPocketBaseTokenFromRequest).mockReturnValue("pb-token-1");

    const response = await POST(
      new Request("http://localhost/api/auth/me", {
        method: "POST",
        body: JSON.stringify({ password: "short" })
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Password must be at least 8 characters" });
    expect(updateUserPassword).not.toHaveBeenCalled();
  });

  it("updates the password for authenticated users", async () => {
    vi.mocked(getSessionUserIdFromRequest).mockReturnValue("user-1");
    vi.mocked(getSessionPocketBaseTokenFromRequest).mockReturnValue("pb-token-1");
    vi.mocked(updateUserPassword).mockResolvedValue(undefined);

    const response = await POST(
      new Request("http://localhost/api/auth/me", {
        method: "POST",
        body: JSON.stringify({ password: "super-secret-1", oldPassword: "legacy-secret" })
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(updateUserPassword).toHaveBeenCalledTimes(1);
    expect(updateUserPassword).toHaveBeenCalledWith(
      "user-1",
      { password: "super-secret-1", oldPassword: "legacy-secret" },
      "pb-token-1"
    );
  });

  it("deletes the account for authenticated users", async () => {
    vi.mocked(getSessionUserIdFromRequest).mockReturnValue("user-1");
    vi.mocked(getSessionPocketBaseTokenFromRequest).mockReturnValue("pb-token-1");
    vi.mocked(deleteUserAccount).mockResolvedValue(undefined);

    const response = await DELETE(new Request("http://localhost/api/auth/me", { method: "DELETE" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(deleteUserAccount).toHaveBeenCalledTimes(1);
    expect(deleteUserAccount).toHaveBeenCalledWith("user-1", "pb-token-1");
  });
});

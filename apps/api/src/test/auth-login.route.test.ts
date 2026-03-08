import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@fulbito/server-core/m3-repo", () => ({
  loginWithPassword: vi.fn()
}));

vi.mock("@fulbito/server-core/auth-sessions", () => ({
  issueRefreshSessionWithId: vi.fn()
}));

vi.mock("@fulbito/server-core/rate-limit", () => ({
  getRequesterFingerprint: vi.fn(() => "test-client"),
  enforceRateLimit: vi.fn(() => ({
    allowed: true,
    remaining: 19,
    retryAfterSeconds: 0
  }))
}));

import { issueRefreshSessionWithId } from "@fulbito/server-core/auth-sessions";
import { loginWithPassword } from "@fulbito/server-core/m3-repo";
import { POST } from "../routes/auth/login-password/route";

describe("POST /api/auth/login-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when email or password is missing", async () => {
    const request = new Request("http://localhost/api/auth/login-password", {
      method: "POST",
      body: JSON.stringify({ email: "", password: "" })
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Email and password are required" });
  });

  it("issues auth tokens and persists refresh session", async () => {
    vi.mocked(loginWithPassword).mockResolvedValue({
      user: {
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        username: "testuser",
        favoriteTeam: null
      },
      token: "pb-token-1"
    });

    vi.mocked(issueRefreshSessionWithId).mockResolvedValue({
      recordId: "rec-1",
      sessionId: "sid-1",
      userId: "user-1",
      refreshTokenHash: "hash",
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 1000).toISOString(),
      revokedAt: null,
      replacedBySessionId: null,
      storage: "memory"
    });

    const request = new Request("http://localhost/api/auth/login-password", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", password: "super-secret" })
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      ok: boolean;
      accessToken?: string;
      refreshToken?: string;
      user?: { id: string };
    };

    expect(body.ok).toBe(true);
    expect(body.user?.id).toBe("user-1");
    expect(typeof body.accessToken).toBe("string");
    expect(typeof body.refreshToken).toBe("string");

    expect(issueRefreshSessionWithId).toHaveBeenCalledTimes(1);
    expect(issueRefreshSessionWithId).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        authToken: "pb-token-1"
      })
    );

    const setCookies = (response.headers as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
    const cookieBlob = setCookies.join(";");
    expect(cookieBlob).toContain("fulbito_access=");
    expect(cookieBlob).toContain("fulbito_refresh=");
    expect(cookieBlob).toContain("fulbito_session=");
  });
});

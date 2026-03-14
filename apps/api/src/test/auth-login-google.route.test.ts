import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@fulbito/server-core/m3-repo", () => ({
  loginOrRegisterWithGoogleIdToken: vi.fn()
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
import { loginOrRegisterWithGoogleIdToken } from "@fulbito/server-core/m3-repo";
import { POST } from "../routes/auth/login-google/route";

describe("POST /api/auth/login-google", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when idToken is missing", async () => {
    const request = new Request("http://localhost/api/auth/login-google", {
      method: "POST",
      body: JSON.stringify({ idToken: "" })
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Google idToken is required" });
  });

  it("issues auth tokens and persists refresh session", async () => {
    vi.mocked(loginOrRegisterWithGoogleIdToken).mockResolvedValue({
      user: {
        id: "user-google-1",
        email: "google@example.com",
        name: "Google User",
        username: "googleuser",
        favoriteTeam: null
      },
      token: "pb-google-token"
    });

    vi.mocked(issueRefreshSessionWithId).mockResolvedValue({
      recordId: "rec-1",
      sessionId: "sid-1",
      userId: "user-google-1",
      refreshTokenHash: "hash",
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 1000).toISOString(),
      revokedAt: null,
      replacedBySessionId: null,
      storage: "memory"
    });

    const request = new Request("http://localhost/api/auth/login-google", {
      method: "POST",
      body: JSON.stringify({ idToken: "valid-google-id-token" })
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
    expect(body.user?.id).toBe("user-google-1");
    expect(typeof body.accessToken).toBe("string");
    expect(typeof body.refreshToken).toBe("string");
    expect(loginOrRegisterWithGoogleIdToken).toHaveBeenCalledWith("valid-google-id-token");
    expect(issueRefreshSessionWithId).toHaveBeenCalledTimes(1);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});

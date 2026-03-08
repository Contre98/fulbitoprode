import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@fulbito/server-core/auth-sessions", () => ({
  rotateRefreshSession: vi.fn(),
  revokeRefreshSession: vi.fn()
}));

import { revokeRefreshSession, rotateRefreshSession } from "@fulbito/server-core/auth-sessions";
import { createRefreshToken } from "@fulbito/server-core/session";
import { POST as refreshPost } from "../routes/auth/refresh/route";
import { POST as logoutPost } from "../routes/auth/logout/route";

describe("POST /api/auth/refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for invalid refresh token", async () => {
    const request = new Request("http://localhost/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: "invalid" })
    });

    const response = await refreshPost(request);
    expect(response.status).toBe(401);
  });

  it("rotates refresh token and returns next access token", async () => {
    const incomingRefreshToken = createRefreshToken({
      userId: "user-2",
      pbToken: "pb-token-2",
      sessionId: "sid-2"
    });

    vi.mocked(rotateRefreshSession).mockResolvedValue({
      ok: true,
      previous: {
        recordId: "prev-rec",
        sessionId: "sid-2",
        userId: "user-2",
        refreshTokenHash: "hash-prev",
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 1000).toISOString(),
        revokedAt: new Date().toISOString(),
        replacedBySessionId: "sid-3",
        storage: "memory"
      },
      next: {
        recordId: "next-rec",
        sessionId: "sid-3",
        userId: "user-2",
        refreshTokenHash: "hash-next",
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 1000).toISOString(),
        revokedAt: null,
        replacedBySessionId: null,
        storage: "memory"
      }
    });

    const request = new Request("http://localhost/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: incomingRefreshToken })
    });

    const response = await refreshPost(request);
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      ok: boolean;
      accessToken?: string;
      refreshToken?: string;
    };

    expect(body.ok).toBe(true);
    expect(typeof body.accessToken).toBe("string");
    expect(typeof body.refreshToken).toBe("string");

    expect(rotateRefreshSession).toHaveBeenCalledTimes(1);
    expect(rotateRefreshSession).toHaveBeenCalledWith(
      expect.objectContaining({
        priorSessionId: "sid-2",
        priorUserId: "user-2",
        authToken: "pb-token-2",
        priorRefreshToken: incomingRefreshToken
      })
    );
  });
});

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("revokes refresh session when refresh token exists", async () => {
    const refreshToken = createRefreshToken({
      userId: "user-3",
      pbToken: "pb-token-3",
      sessionId: "sid-3"
    });

    const request = new Request("http://localhost/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken })
    });

    const response = await logoutPost(request);
    expect(response.status).toBe(200);

    expect(revokeRefreshSession).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "sid-3",
        userId: "user-3",
        authToken: "pb-token-3"
      })
    );
  });
});

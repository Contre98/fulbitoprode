import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/auth/forgot-password/route";

const requestPasswordResetMock = vi.fn();
const getRequesterFingerprintMock = vi.fn();
const enforceRateLimitMock = vi.fn();

vi.mock("@/lib/m3-repo", () => ({
  requestPasswordReset: (...args: unknown[]) => requestPasswordResetMock(...args)
}));

vi.mock("@/lib/rate-limit", () => ({
  getRequesterFingerprint: (...args: unknown[]) => getRequesterFingerprintMock(...args),
  enforceRateLimit: (...args: unknown[]) => enforceRateLimitMock(...args)
}));

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRequesterFingerprintMock.mockReturnValue("client-1");
    enforceRateLimitMock.mockReturnValue({
      allowed: true,
      remaining: 7,
      retryAfterSeconds: 60
    });
    requestPasswordResetMock.mockResolvedValue(undefined);
  });

  it("requests password reset with normalized email and returns generic success", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "  USER@Example.Com " })
      })
    );

    expect(response.status).toBe(200);
    expect(enforceRateLimitMock).toHaveBeenCalledWith("auth:forgot-password:client-1", {
      limit: 8,
      windowMs: 15 * 60 * 1000
    });
    expect(requestPasswordResetMock).toHaveBeenCalledWith("user@example.com");
    const payload = (await response.json()) as { ok: boolean; message: string };
    expect(payload).toEqual({
      ok: true,
      message: "If an account exists for this email, we sent password reset instructions."
    });
  });

  it("returns 429 when rate limit is exceeded", async () => {
    enforceRateLimitMock.mockReturnValueOnce({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 42
    });

    const response = await POST(
      new Request("http://localhost/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@example.com" })
      })
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("42");
    expect(requestPasswordResetMock).not.toHaveBeenCalled();
  });

  it("returns 400 when email is missing", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      })
    );

    expect(response.status).toBe(400);
    const payload = (await response.json()) as { error?: string };
    expect(payload.error).toBe("Email is required");
    expect(requestPasswordResetMock).not.toHaveBeenCalled();
  });

  it("returns 400 when email is invalid", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "not-an-email" })
      })
    );

    expect(response.status).toBe(400);
    const payload = (await response.json()) as { error?: string };
    expect(payload.error).toBe("Email is invalid");
    expect(requestPasswordResetMock).not.toHaveBeenCalled();
  });

  it("returns 400 when payload is invalid JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{"
      })
    );

    expect(response.status).toBe(400);
    const payload = (await response.json()) as { error?: string };
    expect(payload.error).toBe("Invalid payload");
    expect(requestPasswordResetMock).not.toHaveBeenCalled();
  });

  it("returns generic success even when reset request fails", async () => {
    requestPasswordResetMock.mockRejectedValueOnce(new Error("user not found"));

    const response = await POST(
      new Request("http://localhost/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@example.com" })
      })
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { ok: boolean; message: string };
    expect(payload.ok).toBe(true);
    expect(payload.message).toBe("If an account exists for this email, we sent password reset instructions.");
  });
});

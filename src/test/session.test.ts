import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "@/lib/session";

describe("session token signing", () => {
  it("signs and verifies tokens with configured secret", () => {
    process.env.SESSION_SECRET = "session-secret-for-test";
    const token = createSessionToken({ userId: "u1", pbToken: "pb-token" }, 60);
    const payload = verifySessionToken(token);

    expect(payload?.uid).toBe("u1");
    expect(payload?.pbt).toBe("pb-token");
    expect(typeof payload?.exp).toBe("number");
  });

  it("throws in production when SESSION_SECRET is missing", () => {
    const env = process.env as Record<string, string | undefined>;
    const previousSecret = process.env.SESSION_SECRET;
    const previousNodeEnv = process.env.NODE_ENV;

    delete env.SESSION_SECRET;
    env.NODE_ENV = "production";

    expect(() => createSessionToken({ userId: "u1", pbToken: "pb-token" })).toThrow(
      "SESSION_SECRET is required in production."
    );

    env.SESSION_SECRET = previousSecret;
    env.NODE_ENV = previousNodeEnv;
  });
});

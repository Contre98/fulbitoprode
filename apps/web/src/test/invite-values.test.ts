import { describe, expect, it } from "vitest";
import { generateInviteValues } from "@/lib/m3-repo";

describe("generateInviteValues", () => {
  it("creates uppercase code and long token", () => {
    const invite = generateInviteValues();
    expect(invite.code).toMatch(/^[A-Z0-9]{8}$/);
    expect(invite.token.length).toBeGreaterThanOrEqual(32);
    expect(new Date(invite.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("produces high-entropy unique values", () => {
    const seenCodes = new Set<string>();
    const seenTokens = new Set<string>();

    for (let i = 0; i < 200; i += 1) {
      const invite = generateInviteValues();
      seenCodes.add(invite.code);
      seenTokens.add(invite.token);
    }

    expect(seenCodes.size).toBe(200);
    expect(seenTokens.size).toBe(200);
  });
});

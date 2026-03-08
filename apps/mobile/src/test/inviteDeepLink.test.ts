import { parseInviteTokenFromUrl } from "@/lib/inviteDeepLink";

describe("invite deep link parsing", () => {
  it("parses invite token from https URL", () => {
    expect(parseInviteTokenFromUrl("https://fulbito.local/configuracion?invite=abc123")).toBe("abc123");
  });

  it("parses invite token from custom scheme URL", () => {
    expect(parseInviteTokenFromUrl("fulbito://configuracion?invite=token-xyz")).toBe("token-xyz");
  });

  it("returns null when invite token is missing", () => {
    expect(parseInviteTokenFromUrl("fulbito://configuracion")).toBeNull();
  });
});

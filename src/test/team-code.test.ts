import { describe, expect, it } from "vitest";
import { formatTeamCode } from "@/lib/liga-live-provider";

describe("formatTeamCode", () => {
  it("uses first three normalized letters", () => {
    expect(formatTeamCode("San Lorenzo")).toBe("SAN");
    expect(formatTeamCode("Atlético Tucumán")).toBe("ATL");
    expect(formatTeamCode("Ñublense")).toBe("NUB");
  });

  it("pads short values", () => {
    expect(formatTeamCode("U")).toBe("UXX");
  });
});

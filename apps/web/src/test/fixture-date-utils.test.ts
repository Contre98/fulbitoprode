import { describe, expect, it } from "vitest";
import {
  compareFixturesByStatusAndKickoff,
  fixtureDateKey,
  fixtureDateLabel,
  groupFixturesByDate
} from "@fulbito/domain";

describe("fixture date utilities", () => {
  it("builds timezone-aware date keys", () => {
    const kickoff = "2026-03-04T01:30:00.000Z";
    expect(fixtureDateKey(kickoff, { timeZone: "America/Argentina/Buenos_Aires" })).toBe("2026-03-03");
  });

  it("groups fixtures by date key in ascending order", () => {
    const groups = groupFixturesByDate(
      [
        { id: "b", kickoffAt: "2026-03-05T20:00:00.000Z" },
        { id: "a", kickoffAt: "2026-03-03T20:00:00.000Z" }
      ],
      { timeZone: "UTC" }
    );

    expect(groups.map((group) => group.dateKey)).toEqual(["2026-03-03", "2026-03-05"]);
  });

  it("sorts live before upcoming before final", () => {
    const sorted = [
      { id: "final", status: "final" as const, kickoffAt: "2026-03-03T10:00:00.000Z" },
      { id: "live", status: "live" as const, kickoffAt: "2026-03-03T12:00:00.000Z" },
      { id: "upcoming", status: "upcoming" as const, kickoffAt: "2026-03-03T08:00:00.000Z" }
    ].sort(compareFixturesByStatusAndKickoff);

    expect(sorted.map((item) => item.id)).toEqual(["live", "upcoming", "final"]);
  });

  it("formats spanish date labels", () => {
    const label = fixtureDateLabel("2026-03-03T20:00:00.000Z", { locale: "es-AR", timeZone: "UTC" });
    expect(label).toContain("de");
    expect(label).toContain(",");
  });
});

import type { Fixture } from "@fulbito/domain";
import { filterHomeFixtures } from "@/screens/homeFilters";

const fixtures: Fixture[] = [
  { id: "a", homeTeam: "A", awayTeam: "B", kickoffAt: "2026-01-01T10:00:00.000Z", status: "upcoming" },
  { id: "b", homeTeam: "C", awayTeam: "D", kickoffAt: "2026-01-01T11:00:00.000Z", status: "live" },
  { id: "c", homeTeam: "E", awayTeam: "F", kickoffAt: "2026-01-01T12:00:00.000Z", status: "final" }
];

describe("filterHomeFixtures", () => {
  it("returns all fixtures for all filter", () => {
    expect(filterHomeFixtures(fixtures, "all")).toHaveLength(3);
  });

  it("returns only live fixtures for live filter", () => {
    const result = filterHomeFixtures(fixtures, "live");
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("b");
  });

  it("returns only upcoming fixtures for upcoming filter", () => {
    const result = filterHomeFixtures(fixtures, "upcoming");
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("a");
  });
});

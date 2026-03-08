import type { Fixture } from "@fulbito/domain";
import { filterHomeFixtures } from "@/screens/homeFilters";

const fixtures: Fixture[] = [
  { id: "a", homeTeam: "A", awayTeam: "B", kickoffAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), status: "upcoming" },
  { id: "b", homeTeam: "C", awayTeam: "D", kickoffAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), status: "live" },
  { id: "c", homeTeam: "E", awayTeam: "F", kickoffAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), status: "final" }
];

describe("filterHomeFixtures", () => {
  it("returns only live/upcoming fixtures for all filter", () => {
    const result = filterHomeFixtures(fixtures, "all");
    expect(result).toHaveLength(2);
    expect(result.map((row) => row.id)).toEqual(["b", "a"]);
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

  it("excludes stale upcoming fixtures whose kickoff is already in the past", () => {
    const staleUpcoming: Fixture = {
      id: "d",
      homeTeam: "G",
      awayTeam: "H",
      kickoffAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      status: "upcoming"
    };

    const result = filterHomeFixtures([...fixtures, staleUpcoming], "all");
    expect(result.map((row) => row.id)).not.toContain("d");
  });
});

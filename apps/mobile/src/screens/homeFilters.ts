import type { Fixture } from "@fulbito/domain";

export type HomeFixtureFilter = "all" | "live" | "upcoming";

export function filterHomeFixtures(fixtures: Fixture[], filter: HomeFixtureFilter) {
  if (filter === "all") {
    return fixtures;
  }
  return fixtures.filter((fixture) => fixture.status === filter);
}

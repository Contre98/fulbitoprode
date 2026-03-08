import type { Fixture } from "@fulbito/domain";
import { compareFixturesByStatusAndKickoff } from "@fulbito/domain";

export type HomeFixtureFilter = "all" | "live" | "upcoming";

export function filterHomeFixtures(fixtures: Fixture[], filter: HomeFixtureFilter) {
  const ordered = [...fixtures].sort(compareFixturesByStatusAndKickoff);
  const nowMs = Date.now();
  const isOpenUpcoming = (fixture: Fixture) => {
    if (fixture.status !== "upcoming") return false;
    const kickoffMs = new Date(fixture.kickoffAt).getTime();
    return Number.isFinite(kickoffMs) && kickoffMs > nowMs;
  };

  if (filter === "all") {
    const live = ordered.filter((fixture) => fixture.status === "live");
    const upcoming = ordered.filter(isOpenUpcoming);
    return [...live, ...upcoming];
  }

  if (filter === "upcoming") {
    return ordered.filter(isOpenUpcoming);
  }

  return ordered.filter((fixture) => fixture.status === "live");
}

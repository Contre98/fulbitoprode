import { describe, expect, it } from "vitest";
import { mapFixturesToFixtureCards, type LiveFixture } from "@/lib/liga-live-provider";

function fixture(overrides: Partial<LiveFixture> = {}): LiveFixture {
  return {
    id: "fx-default",
    kickoffAt: "2026-03-08T20:00:00.000Z",
    statusShort: "NS",
    statusLong: "Not Started",
    elapsed: null,
    venue: "Monumental",
    homeName: "Home FC",
    awayName: "Away FC",
    homeGoals: null,
    awayGoals: null,
    ...overrides
  };
}

describe("mapFixturesToFixtureCards", () => {
  it("includes structured score for live/final rows and omits it for upcoming rows", () => {
    const cards = mapFixturesToFixtureCards([
      fixture({
        id: "fx-live",
        statusShort: "1H",
        statusLong: "First Half",
        elapsed: 33,
        homeName: "Live Home",
        awayName: "Live Away",
        homeGoals: 2,
        awayGoals: 1
      }),
      fixture({
        id: "fx-final",
        statusShort: "FT",
        statusLong: "Match Finished",
        elapsed: 90,
        homeName: "Final Home",
        awayName: "Final Away",
        homeGoals: 3,
        awayGoals: 0
      }),
      fixture({
        id: "fx-upcoming",
        statusShort: "NS",
        statusLong: "Not Started",
        homeName: "Upcoming Home",
        awayName: "Upcoming Away",
        homeGoals: null,
        awayGoals: null
      })
    ]);

    const rows = cards.flatMap((card) => card.rows);
    const liveRow = rows.find((row) => row.home === "Live Home");
    const finalRow = rows.find((row) => row.home === "Final Home");
    const upcomingRow = rows.find((row) => row.home === "Upcoming Home");

    expect(liveRow?.score).toEqual({ home: 2, away: 1 });
    expect(finalRow?.score).toEqual({ home: 3, away: 0 });
    expect(upcomingRow?.score).toBeUndefined();
  });
});

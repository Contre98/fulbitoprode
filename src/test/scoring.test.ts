import { describe, expect, it } from "vitest";
import { calculatePredictionPoints, SCORE_RULES } from "@/lib/scoring";

describe("scoring", () => {
  it("returns exact score points", () => {
    expect(calculatePredictionPoints({ home: 2, away: 1 }, { home: 2, away: 1 })).toBe(SCORE_RULES.exact);
  });

  it("returns outcome points", () => {
    expect(calculatePredictionPoints({ home: 3, away: 1 }, { home: 1, away: 0 })).toBe(SCORE_RULES.outcome);
    expect(calculatePredictionPoints({ home: 1, away: 1 }, { home: 0, away: 0 })).toBe(SCORE_RULES.outcome);
  });

  it("returns miss points", () => {
    expect(calculatePredictionPoints({ home: 0, away: 2 }, { home: 2, away: 0 })).toBe(SCORE_RULES.miss);
  });
});

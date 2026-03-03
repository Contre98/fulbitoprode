import { describe, expect, it } from "vitest";
import { isPredictionInputComplete, normalizePredictionInput } from "@fulbito/domain";

describe("prediction input helpers", () => {
  it("normalizes valid numeric drafts", () => {
    const value = normalizePredictionInput({ home: "2", away: " 10 " });
    expect(value).toEqual({ home: 2, away: 10 });
    expect(isPredictionInputComplete(value)).toBe(true);
  });

  it("treats invalid drafts as incomplete", () => {
    const value = normalizePredictionInput({ home: "abc", away: "" });
    expect(value).toEqual({ home: null, away: null });
    expect(isPredictionInputComplete(value)).toBe(false);
  });

  it("rejects out-of-range goals", () => {
    const value = normalizePredictionInput({ home: "100", away: "1" });
    expect(value).toEqual({ home: null, away: 1 });
    expect(isPredictionInputComplete(value)).toBe(false);
  });
});

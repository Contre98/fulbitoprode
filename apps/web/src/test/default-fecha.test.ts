import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveDefaultFecha } from "@/lib/liga-live-provider";

describe("resolveDefaultFecha", () => {
  beforeEach(() => {
    process.env.API_FOOTBALL_BASE_URL = "https://provider.test";
    process.env.API_FOOTBALL_KEY = "provider-key";
    process.env.API_FOOTBALL_DEFAULT_SEASON = "2026";
    process.env.API_FOOTBALL_ARG_LEAGUE_ID = "128";
  });

  it("prefers live fecha over upcoming", async () => {
    global.fetch = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = new URL(typeof input === "string" ? input : input.toString());
      const round = url.searchParams.get("round");

      if (round === "Fecha 1") {
        return {
          ok: true,
          json: async () => ({
            response: [
              {
                fixture: {
                  id: 1,
                  date: "2026-02-14T20:00:00.000Z",
                  status: { short: "NS", long: "Not Started", elapsed: null }
                },
                teams: { home: { name: "Home" }, away: { name: "Away" } },
                goals: { home: null, away: null }
              }
            ]
          })
        };
      }

      return {
        ok: true,
        json: async () => ({
          response: [
            {
              fixture: {
                id: 2,
                date: "2026-02-14T22:00:00.000Z",
                status: { short: "1H", long: "First Half", elapsed: 12 }
              },
              teams: { home: { name: "Home" }, away: { name: "Away" } },
              goals: { home: 0, away: 0 }
            }
          ]
        })
      };
    }) as unknown as typeof fetch;

    const result = await resolveDefaultFecha({
      leagueId: 128,
      season: "2026",
      competitionStage: "apertura",
      fechas: ["Fecha 1", "Fecha 2"]
    });

    expect(result).toBe("Fecha 2");
  });
});

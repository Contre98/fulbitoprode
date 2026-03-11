import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type MockFetchResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

describe("@fulbito/server-core liga-live-provider", () => {
  const originalFetch = global.fetch;
  const originalQueueMicrotask = global.queueMicrotask;
  const originalEnv = {
    API_FOOTBALL_BASE_URL: process.env.API_FOOTBALL_BASE_URL,
    API_FOOTBALL_KEY: process.env.API_FOOTBALL_KEY,
    API_FOOTBALL_DEFAULT_SEASON: process.env.API_FOOTBALL_DEFAULT_SEASON
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal("queueMicrotask", vi.fn());
    process.env.API_FOOTBALL_BASE_URL = "https://provider.test";
    process.env.API_FOOTBALL_KEY = "test-key";
    process.env.API_FOOTBALL_DEFAULT_SEASON = "2026";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.queueMicrotask = originalQueueMicrotask;
    process.env.API_FOOTBALL_BASE_URL = originalEnv.API_FOOTBALL_BASE_URL;
    process.env.API_FOOTBALL_KEY = originalEnv.API_FOOTBALL_KEY;
    process.env.API_FOOTBALL_DEFAULT_SEASON = originalEnv.API_FOOTBALL_DEFAULT_SEASON;
  });

  it("maps legacy yyyy-mm periods to the matching provider round number", async () => {
    const fetchMock = vi.fn<Promise<MockFetchResponse>, [string, RequestInit | undefined]>();
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ response: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ response: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ response: ["Regular Season - 1", "Regular Season - 2"] })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          response: [
            {
              fixture: {
                id: 101,
                date: "2026-03-20T20:00:00.000Z",
                status: { short: "NS", long: "Not Started", elapsed: null },
                venue: { name: "Monumental" }
              },
              teams: {
                home: { name: "River Plate", logo: "https://example.com/river.png" },
                away: { name: "San Lorenzo", logo: "https://example.com/slo.png" }
              },
              goals: { home: null, away: null }
            }
          ]
        })
      });
    global.fetch = fetchMock as unknown as typeof global.fetch;

    const { fetchLigaArgentinaFixtures, formatRoundLabel } = await import("@fulbito/server-core/liga-live-provider");

    const fixtures = await fetchLigaArgentinaFixtures({
      period: "2026-01",
      leagueId: 128,
      season: "2026",
      competitionStage: "apertura"
    });

    expect(formatRoundLabel("2026-01")).toBe("Fecha 1");
    expect(fixtures).toHaveLength(1);
    expect(fixtures[0]).toEqual(
      expect.objectContaining({
        id: "101",
        homeName: "River Plate",
        awayName: "San Lorenzo",
        kickoffAt: "2026-03-20T20:00:00.000Z",
        statusShort: "NS"
      })
    );
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://provider.test/fixtures?league=128&season=2026&timezone=America%2FArgentina%2FBuenos_Aires&round=2026-01",
      expect.any(Object)
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "https://provider.test/fixtures/rounds?league=128&season=2026",
      expect.any(Object)
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "https://provider.test/fixtures?league=128&season=2026&timezone=America%2FArgentina%2FBuenos_Aires&round=Regular+Season+-+1",
      expect.any(Object)
    );
  });
});

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

  it("falls back to legacy fechas when provider rounds endpoint returns empty", async () => {
    const fetchMock = vi.fn<Promise<MockFetchResponse>, [string, RequestInit | undefined]>();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ response: [] })
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;

    const { fetchAvailableFechas } = await import("@fulbito/server-core/liga-live-provider");

    const fechas = await fetchAvailableFechas({
      leagueId: 128,
      season: "2026",
      competitionStage: "apertura"
    });

    expect(fechas).toEqual(["fecha14", "fecha15"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://provider.test/fixtures/rounds?league=128&season=2026",
      expect.any(Object)
    );
  });

  it("falls back to legacy fechas when provider config is missing", async () => {
    process.env.API_FOOTBALL_BASE_URL = "";
    process.env.API_FOOTBALL_KEY = "";
    process.env.FOOTBALL_API_BASE_URL = "";
    process.env.FOOTBALL_API_KEY = "";

    const { fetchAvailableFechas } = await import("@fulbito/server-core/liga-live-provider");

    const fechas = await fetchAvailableFechas({
      leagueId: 128,
      season: "2026",
      competitionStage: "apertura"
    });

    expect(fechas).toEqual(["fecha14", "fecha15"]);
  });

  it("falls back to legacy fechas when provider rounds request fails", async () => {
    const fetchMock = vi.fn<Promise<MockFetchResponse>, [string, RequestInit | undefined]>();
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({})
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;

    const { fetchAvailableFechas } = await import("@fulbito/server-core/liga-live-provider");

    const fechas = await fetchAvailableFechas({
      leagueId: 128,
      season: "2026",
      competitionStage: "apertura"
    });

    expect(fechas).toEqual(["fecha14", "fecha15"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses short cache ttl when a fixture is close to kickoff", async () => {
    vi.useFakeTimers();
    try {
      const now = new Date("2026-03-16T20:00:00.000Z");
      vi.setSystemTime(now);

      const fetchMock = vi.fn<Promise<MockFetchResponse>, [string, RequestInit | undefined]>();
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            response: [
              {
                fixture: {
                  id: 7001,
                  date: "2026-03-16T20:10:00.000Z",
                  status: { short: "NS", long: "Not Started", elapsed: null },
                  venue: { name: "Bombonera" }
                },
                teams: {
                  home: { name: "Boca Juniors", logo: "https://example.com/boca.png" },
                  away: { name: "Union Santa Fe", logo: "https://example.com/union.png" }
                },
                goals: { home: null, away: null }
              }
            ]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            response: [
              {
                fixture: {
                  id: 7001,
                  date: "2026-03-16T20:10:00.000Z",
                  status: { short: "1H", long: "First Half", elapsed: 8 },
                  venue: { name: "Bombonera" }
                },
                teams: {
                  home: { name: "Boca Juniors", logo: "https://example.com/boca.png" },
                  away: { name: "Union Santa Fe", logo: "https://example.com/union.png" }
                },
                goals: { home: 1, away: 0 }
              }
            ]
          })
        });
      global.fetch = fetchMock as unknown as typeof global.fetch;

      const { fetchLigaArgentinaFixtures } = await import("@fulbito/server-core/liga-live-provider");

      const first = await fetchLigaArgentinaFixtures({
        period: "Fecha 10",
        leagueId: 128,
        season: "2026",
        competitionStage: "apertura"
      });
      expect(first[0]?.statusShort).toBe("NS");

      vi.setSystemTime(new Date(now.getTime() + 61_000));

      const second = await fetchLigaArgentinaFixtures({
        period: "Fecha 10",
        leagueId: 128,
        season: "2026",
        competitionStage: "apertura"
      });
      expect(second[0]?.statusShort).toBe("1H");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});

import { mockFixtureRepository, mockLeaderboardRepository } from "@/repositories/mockDataRepositories";

type MockResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

declare global {
  var __FULBITO_TEST_API_BASE_URL__: string | undefined;
}

describe("Repository adapters contract parity", () => {
  const originalFetch = global.fetch;
  const originalApiBase = process.env.EXPO_PUBLIC_API_BASE_URL;

  function setApiBaseUrl(value: string | undefined) {
    Object.defineProperty(process.env, "EXPO_PUBLIC_API_BASE_URL", {
      value,
      configurable: true,
      writable: true
    });
  }

  function expectNoCookieCredentials(
    fetchMock: jest.Mock<Promise<MockResponse>, [string, RequestInit | undefined]>,
    callIndex: number
  ) {
    const init = fetchMock.mock.calls[callIndex]?.[1];
    expect(init ?? {}).toEqual(expect.not.objectContaining({ credentials: "include" }));
  }

  beforeEach(() => {
    jest.resetAllMocks();
    jest.resetModules();
    setApiBaseUrl("http://localhost:3000");
    global.__FULBITO_TEST_API_BASE_URL__ = "http://localhost:3000";
  });

  afterAll(() => {
    global.fetch = originalFetch;
    setApiBaseUrl(originalApiBase);
    delete global.__FULBITO_TEST_API_BASE_URL__;
  });

  it("normalizes fixture edge cases in HTTP adapter while keeping contract parity with mock adapter", async () => {
    const fetchMock = jest.fn<Promise<MockResponse>, [string, RequestInit | undefined]>();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        period: "Fecha 3",
        periodLabel: "Fecha 3",
        cards: [],
        matches: [
          {
            id: "fx-http-live",
            status: "live",
            kickoffAt: "2026-03-06T01:00:00.000Z",
            homeTeam: { code: "AJ", name: "Argentinos Juniors" },
            awayTeam: { code: "LAN", name: "Lanus" },
            score: {
              home: 2,
              away: 1
            }
          },
          {
            id: "fx-http-final",
            status: "final",
            kickoffAt: "2026-03-06T01:39:00.000Z",
            homeTeam: { code: "DYJ" },
            awayTeam: { code: "BC" },
            score: {
              home: 1,
              away: 0
            }
          }
        ],
        updatedAt: "2026-03-06T02:00:00.000Z"
      })
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;
    const { httpFixtureRepository } = require("@/repositories/httpDataRepositories");

    const httpRows = await httpFixtureRepository.listFixture({
      groupId: "g-1",
      fecha: "3"
    });
    const mockRows = await mockFixtureRepository.listFixture({
      groupId: "g-1",
      fecha: "3"
    });

    expect(httpRows).toHaveLength(2);
    expect(httpRows[0]).toEqual(
      expect.objectContaining({
        id: "fx-http-live",
        homeTeam: "Argentinos Juniors",
        awayTeam: "Lanus",
        status: "live",
        score: {
          home: 2,
          away: 1
        }
      })
    );
    expect(new Date(httpRows[0].kickoffAt).toString()).not.toBe("Invalid Date");
    expect(httpRows[1]).toEqual(
      expect.objectContaining({
        id: "fx-http-final",
        homeTeam: "DYJ",
        awayTeam: "BC",
        status: "final",
        kickoffAt: "2026-03-06T01:39:00.000Z",
        score: {
          home: 1,
          away: 0
        }
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/fixture?period=3&groupId=g-1",
      expect.any(Object)
    );
    expectNoCookieCredentials(fetchMock, 0);

    [httpRows[0], httpRows[1], mockRows[0]].forEach((row) => {
      expect(row).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          homeTeam: expect.any(String),
          awayTeam: expect.any(String),
          kickoffAt: expect.any(String),
          status: expect.stringMatching(/^(upcoming|live|final)$/)
        })
      );
    });
  });

  it("normalizes leaderboard rows with missing userId while matching mock contract shape", async () => {
    const fetchMock = jest.fn<Promise<MockResponse>, [string, RequestInit | undefined]>();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        rows: [
          { rank: 1, userId: "u-http-1", name: "Usuario HTTP", points: 27 },
          { rank: 2, name: "Invitado", points: 9 }
        ]
      })
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;
    const { httpLeaderboardRepository } = require("@/repositories/httpDataRepositories");

    const httpRows = await httpLeaderboardRepository.getLeaderboard({
      groupId: "g-1",
      fecha: "3"
    });
    const mockRows = await mockLeaderboardRepository.getLeaderboard({
      groupId: "g-1",
      fecha: "3"
    });

    expect(httpRows).toEqual([
      { userId: "u-http-1", displayName: "Usuario HTTP", points: 27, rank: 1 },
      { userId: "row-2-Invitado", displayName: "Invitado", points: 9, rank: 2 }
    ]);

    [httpRows[0], httpRows[1], mockRows[0]].forEach((row) => {
      expect(row).toEqual(
        expect.objectContaining({
          userId: expect.any(String),
          displayName: expect.any(String),
          points: expect.any(Number),
          rank: expect.any(Number)
        })
      );
    });
  });

  it("preserves leaderboard stats payload contract from web response in stats mode", async () => {
    const fetchMock = jest.fn<Promise<MockResponse>, [string, RequestInit | undefined]>();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        groupLabel: "Grupo HTTP",
        mode: "stats",
        period: "global",
        periodLabel: "Global acumulado",
        updatedAt: "2026-03-08T00:00:00.000Z",
        rows: [{ rank: 1, userId: "u-http-1", name: "Usuario HTTP", predictions: 8, record: "6/2/0", points: 18 }],
        groupStats: {
          memberCount: 1,
          scoredPredictions: 8,
          correctPredictions: 8,
          exactPredictions: 6,
          resultPredictions: 2,
          missPredictions: 0,
          accuracyPct: 100,
          totalPoints: 18,
          averageMemberPoints: 18,
          bestFecha: {
            period: "Fecha 1",
            periodLabel: "Fecha 1",
            userId: "u-http-1",
            userName: "Usuario HTTP",
            points: 9
          },
          worstFecha: {
            period: "Fecha 2",
            periodLabel: "Fecha 2",
            userId: "u-http-1",
            userName: "Usuario HTTP",
            points: 9
          },
          worldBenchmark: null
        },
        stats: {
          summary: {
            memberCount: 1,
            scoredPredictions: 8,
            correctPredictions: 8,
            exactPredictions: 6,
            resultPredictions: 2,
            missPredictions: 0,
            accuracyPct: 100,
            totalPoints: 18,
            averageMemberPoints: 18,
            bestRound: {
              period: "Fecha 1",
              periodLabel: "Fecha 1",
              userId: "u-http-1",
              userName: "Usuario HTTP",
              points: 9
            },
            worstRound: {
              period: "Fecha 2",
              periodLabel: "Fecha 2",
              userId: "u-http-1",
              userName: "Usuario HTTP",
              points: 9
            },
            worldBenchmark: null
          },
          awards: [
            {
              id: "nostradamus",
              title: "NOSTRADAMUS",
              winnerUserId: "u-http-1",
              winnerName: "Usuario HTTP",
              subtitle: "Mayor cantidad de plenos (6)",
              metricValue: 6
            }
          ],
          historicalSeries: [
            {
              userId: "u-http-1",
              userName: "Usuario HTTP",
              points: [
                { period: "Fecha 1", periodLabel: "Fecha 1", rank: 1, points: 9 },
                { period: "Fecha 2", periodLabel: "Fecha 2", rank: 1, points: 9 }
              ]
            }
          ]
        }
      })
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;
    const { httpLeaderboardRepository } = require("@/repositories/httpDataRepositories");

    const httpPayload = await httpLeaderboardRepository.getLeaderboardPayload({
      groupId: "g-1",
      fecha: "global",
      mode: "stats"
    });
    const mockPayload = await mockLeaderboardRepository.getLeaderboardPayload({
      groupId: "g-1",
      fecha: "global",
      mode: "stats"
    });

    expect(httpPayload).toEqual(
      expect.objectContaining({
        groupLabel: "Grupo HTTP",
        mode: "stats",
        rows: expect.any(Array),
        groupStats: expect.objectContaining({
          memberCount: expect.any(Number),
          exactPredictions: expect.any(Number),
          resultPredictions: expect.any(Number),
          missPredictions: expect.any(Number)
        }),
        stats: expect.objectContaining({
          summary: expect.objectContaining({
            memberCount: expect.any(Number),
            bestRound: expect.anything(),
            worstRound: expect.anything()
          }),
          awards: expect.any(Array),
          historicalSeries: expect.any(Array)
        })
      })
    );

    expect(httpPayload.stats?.awards?.[0]).toEqual(
      expect.objectContaining({
        id: "nostradamus",
        winnerName: "Usuario HTTP"
      })
    );
    expect(httpPayload.stats?.historicalSeries?.[0]).toEqual(
      expect.objectContaining({
        userId: "u-http-1",
        points: expect.arrayContaining([expect.objectContaining({ period: "Fecha 1", rank: 1, points: 9 })])
      })
    );

    expect(mockPayload).toEqual(
      expect.objectContaining({
        mode: "stats",
        rows: expect.any(Array),
        stats: expect.objectContaining({
          summary: expect.any(Object),
          awards: expect.any(Array),
          historicalSeries: expect.any(Array)
        })
      })
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3000/api/leaderboard?mode=stats&period=global&groupId=g-1",
      expect.any(Object)
    );
    expectNoCookieCredentials(fetchMock, 0);
  });

  it("rejects incomplete /api/fixture payloads without falling back to /api/pronosticos", async () => {
    const fetchMock = jest.fn<Promise<MockResponse>, [string, RequestInit | undefined]>();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        period: "Fecha 3",
        periodLabel: "Fecha 3",
        cards: [],
        updatedAt: "2026-03-06T02:00:00.000Z"
      })
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;
    const { httpFixtureRepository } = require("@/repositories/httpDataRepositories");

    await expect(
      httpFixtureRepository.listFixture({
        groupId: "g-1",
        fecha: "3"
      })
    ).rejects.toBeInstanceOf(Error);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3000/api/fixture?period=3&groupId=g-1",
      expect.any(Object)
    );
    expectNoCookieCredentials(fetchMock, 0);
  });

  it("supports cards-only /api/fixture payloads for backward compatibility", async () => {
    const fetchMock = jest.fn<Promise<MockResponse>, [string, RequestInit | undefined]>();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        period: "Fecha 3",
        periodLabel: "Fecha 3",
        cards: [
          {
            dateLabel: "Sábado 06/03",
            rows: [
              {
                id: "fx-card-live",
                home: "Argentinos Juniors",
                away: "Lanus",
                kickoffAt: "2026-03-06T01:00:00.000Z",
                tone: "live",
                score: { home: 2, away: 1 }
              },
              {
                home: "Boca Juniors",
                away: "Racing Club",
                kickoffAt: "2026-03-06T03:00:00.000Z",
                tone: "upcoming"
              },
              {
                home: "Defensa y Justicia",
                away: "Belgrano Cordoba",
                kickoffAt: "2026-03-06T05:00:00.000Z",
                tone: "final",
                scoreLabel: "FINAL · 3 - 2"
              }
            ]
          }
        ],
        updatedAt: "2026-03-06T02:00:00.000Z"
      })
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;
    const { httpFixtureRepository } = require("@/repositories/httpDataRepositories");

    const rows = await httpFixtureRepository.listFixture({
      groupId: "g-1",
      fecha: "3"
    });

    expect(rows).toEqual(
      expect.arrayContaining([
        {
          id: "fx-card-live",
          homeTeam: "Argentinos Juniors",
          awayTeam: "Lanus",
          kickoffAt: "2026-03-06T01:00:00.000Z",
          status: "live",
          score: { home: 2, away: 1 }
        },
        {
          id: expect.stringMatching(/^fixture-/),
          homeTeam: "Boca Juniors",
          awayTeam: "Racing Club",
          kickoffAt: "2026-03-06T03:00:00.000Z",
          status: "upcoming",
          score: null
        },
        {
          id: expect.stringMatching(/^fixture-/),
          homeTeam: "Defensa y Justicia",
          awayTeam: "Belgrano Cordoba",
          kickoffAt: "2026-03-06T05:00:00.000Z",
          status: "final",
          score: { home: 3, away: 2 }
        }
      ])
    );
  });

  it("retries without period for legacy fallback periods when selected period has no upcoming/live matches", async () => {
    const fetchMock = jest.fn<Promise<MockResponse>, [string, RequestInit | undefined]>();
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          period: "2026-01",
          periodLabel: "Fecha 1",
          cards: [],
          matches: [
            {
              id: "fx-only-final",
              status: "final",
              kickoffAt: "2026-01-20T20:00:00.000Z",
              homeTeam: { code: "BOC", name: "Boca Juniors" },
              awayTeam: { code: "RAC", name: "Racing Club" },
              score: { home: 0, away: 0 }
            }
          ],
          updatedAt: "2026-03-06T02:00:00.000Z"
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          period: "Fecha 9",
          periodLabel: "Fecha 9",
          cards: [],
          matches: [
            {
              id: "fx-upcoming-current",
              status: "upcoming",
              kickoffAt: "2026-03-20T20:00:00.000Z",
              homeTeam: { code: "RIV", name: "River Plate" },
              awayTeam: { code: "SLO", name: "San Lorenzo" }
            }
          ],
          updatedAt: "2026-03-06T02:00:00.000Z"
        })
      });
    global.fetch = fetchMock as unknown as typeof global.fetch;
    const { httpFixtureRepository } = require("@/repositories/httpDataRepositories");

    const rows = await httpFixtureRepository.listFixture({
      groupId: "g-1",
      fecha: "2026-01"
    });

    expect(rows).toHaveLength(2);
    expect(rows).toEqual(
      expect.arrayContaining([
        {
          id: "fx-only-final",
          homeTeam: "Boca Juniors",
          awayTeam: "Racing Club",
          kickoffAt: "2026-01-20T20:00:00.000Z",
          status: "final",
          score: { home: 0, away: 0 }
        },
        {
          id: "fx-upcoming-current",
          homeTeam: "River Plate",
          awayTeam: "San Lorenzo",
          kickoffAt: "2026-03-20T20:00:00.000Z",
          status: "upcoming",
          score: null
        }
      ])
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3000/api/fixture?period=2026-01&groupId=g-1",
      expect.any(Object)
    );
    expectNoCookieCredentials(fetchMock, 0);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3000/api/fixture?groupId=g-1",
      expect.any(Object)
    );
    expectNoCookieCredentials(fetchMock, 1);
  });

  it("rejects malformed fixture payloads that do not satisfy contract shape", async () => {
    const fetchMock = jest.fn<Promise<MockResponse>, [string, RequestInit | undefined]>();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        cards: []
      })
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;
    const { httpFixtureRepository } = require("@/repositories/httpDataRepositories");

    await expect(
      httpFixtureRepository.listFixture({
        groupId: "g-1",
        fecha: "3"
      })
    ).rejects.toBeInstanceOf(Error);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects fixture rows with missing kickoffAt instead of fabricating chronology", async () => {
    const fetchMock = jest.fn<Promise<MockResponse>, [string, RequestInit | undefined]>();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        period: "Fecha 3",
        periodLabel: "Fecha 3",
        cards: [],
        matches: [
          {
            id: "fx-no-kickoff",
            status: "upcoming",
            homeTeam: { code: "BOC", name: "Boca Juniors" },
            awayTeam: { code: "RIV", name: "River Plate" }
          }
        ],
        updatedAt: "2026-03-06T02:00:00.000Z"
      })
    });
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    global.fetch = fetchMock as unknown as typeof global.fetch;
    const { httpFixtureRepository } = require("@/repositories/httpDataRepositories");

    await expect(
      httpFixtureRepository.listFixture({
        groupId: "g-1",
        fecha: "3"
      })
    ).rejects.toThrow("missing kickoffAt");
    expect(errorSpy).toHaveBeenCalledWith(
      "[fixture] missing or invalid kickoffAt in /api/fixture payload",
      expect.objectContaining({
        fixtureId: "fx-no-kickoff"
      })
    );
    errorSpy.mockRestore();
  });

  it("drops score values for upcoming fixtures even when backend sends score fields", async () => {
    const fetchMock = jest.fn<Promise<MockResponse>, [string, RequestInit | undefined]>();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        period: "Fecha 3",
        periodLabel: "Fecha 3",
        cards: [],
        matches: [
          {
            id: "fx-upcoming-with-score",
            status: "upcoming",
            kickoffAt: "2026-03-10T20:00:00.000Z",
            homeTeam: { code: "RIV", name: "River Plate" },
            awayTeam: { code: "SLO", name: "San Lorenzo" },
            score: { home: 4, away: 4 }
          }
        ],
        updatedAt: "2026-03-06T02:00:00.000Z"
      })
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;
    const { httpFixtureRepository } = require("@/repositories/httpDataRepositories");

    const rows = await httpFixtureRepository.listFixture({
      groupId: "g-1",
      fecha: "3"
    });

    expect(rows).toEqual([
      {
        id: "fx-upcoming-with-score",
        homeTeam: "River Plate",
        awayTeam: "San Lorenzo",
        kickoffAt: "2026-03-10T20:00:00.000Z",
        status: "upcoming",
        score: null
      }
    ]);
  });

  it("rejects malformed leaderboard payloads that do not satisfy contract shape", async () => {
    const fetchMock = jest.fn<Promise<MockResponse>, [string, RequestInit | undefined]>();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        entries: []
      })
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;
    const { httpLeaderboardRepository } = require("@/repositories/httpDataRepositories");

    await expect(
      httpLeaderboardRepository.getLeaderboard({
        groupId: "g-1",
        fecha: "3"
      })
    ).rejects.toBeInstanceOf(Error);
  });
});

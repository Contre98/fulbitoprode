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
        matches: [
          {
            id: "fx-http-live",
            status: "live",
            homeTeam: { code: "AJ" },
            awayTeam: { code: "LAN" }
          },
          {
            id: "fx-http-final",
            status: "final",
            kickoffAt: "2026-03-06T01:39:00.000Z",
            homeTeam: { code: "DYJ" },
            awayTeam: { code: "BC" }
          }
        ],
        predictions: {}
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
        homeTeam: "AJ",
        awayTeam: "LAN",
        status: "live"
      })
    );
    expect(new Date(httpRows[0].kickoffAt).toString()).not.toBe("Invalid Date");
    expect(httpRows[1]).toEqual(
      expect.objectContaining({
        id: "fx-http-final",
        homeTeam: "DYJ",
        awayTeam: "BC",
        status: "final",
        kickoffAt: "2026-03-06T01:39:00.000Z"
      })
    );

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
});

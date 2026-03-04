import { mockGroupsRepository, mockPredictionsRepository } from "@/repositories/mockDataRepositories";
import { resetMockGroupStore } from "@/repositories/mockGroupStore";

type MockResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

declare global {
  var __FULBITO_TEST_API_BASE_URL__: string | undefined;
}

describe("Repository adapters contract parity (groups + predictions)", () => {
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
    resetMockGroupStore();
    setApiBaseUrl("http://localhost:3000");
    global.__FULBITO_TEST_API_BASE_URL__ = "http://localhost:3000";
  });

  afterAll(() => {
    global.fetch = originalFetch;
    setApiBaseUrl(originalApiBase);
    delete global.__FULBITO_TEST_API_BASE_URL__;
  });

  it("maps group create/join payloads to the same contract shape in HTTP and mock adapters", async () => {
    const fetchMock = jest.fn<Promise<MockResponse>, [string, RequestInit | undefined]>();
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          group: {
            id: "g-http-create",
            name: "Grupo HTTP",
            season: "2026",
            leagueId: 128
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          group: {
            id: "g-http-join",
            name: "Grupo Join HTTP",
            season: "2026",
            leagueId: 128
          }
        })
      });
    global.fetch = fetchMock as unknown as typeof global.fetch;
    const { httpGroupsRepository } = require("@/repositories/httpDataRepositories");

    const httpCreated = await httpGroupsRepository.createGroup({
      name: "Grupo HTTP",
      season: "2026",
      leagueId: 128,
      competitionStage: "apertura",
      competitionName: "Liga Profesional",
      competitionKey: "argentina-128"
    });
    const mockCreated = await mockGroupsRepository.createGroup({
      name: "Grupo Mock",
      season: "2026",
      leagueId: 128,
      competitionStage: "apertura",
      competitionName: "Liga Profesional",
      competitionKey: "argentina-128"
    });

    const httpJoined = await httpGroupsRepository.joinGroup({ codeOrToken: "INV-HTTP-001" });
    const mockJoined = await mockGroupsRepository.joinGroup({ codeOrToken: "INV-MOCK-001" });

    [httpCreated, mockCreated, httpJoined, mockJoined].forEach((group) => {
      expect(group).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          season: expect.any(String),
          leagueId: expect.any(Number)
        })
      );
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3000/api/groups",
      expect.objectContaining({
        method: "POST",
        credentials: "include"
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3000/api/groups/join",
      expect.objectContaining({
        method: "POST",
        credentials: "include"
      })
    );
  });

  it("keeps predictions contract shape aligned across HTTP and mock adapters", async () => {
    const testGroupId = `group-${Date.now()}`;
    const fetchMock = jest.fn<Promise<MockResponse>, [string, RequestInit | undefined]>();
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          matches: [],
          predictions: {
            "fx-1": { home: 2, away: 1 },
            "fx-incomplete": { home: null, away: 0 }
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true })
      });
    global.fetch = fetchMock as unknown as typeof global.fetch;
    const { httpPredictionsRepository } = require("@/repositories/httpDataRepositories");

    const httpRows = await httpPredictionsRepository.listPredictions({
      groupId: testGroupId,
      fecha: "1"
    });

    await mockPredictionsRepository.savePrediction({
      groupId: testGroupId,
      fecha: "1",
      prediction: {
        fixtureId: "fx-1",
        home: 2,
        away: 1
      }
    });

    const mockRows = await mockPredictionsRepository.listPredictions({
      groupId: testGroupId,
      fecha: "1"
    });

    expect(httpRows).toEqual([
      {
        fixtureId: "fx-1",
        home: 2,
        away: 1
      }
    ]);
    expect(mockRows).toEqual([
      {
        fixtureId: "fx-1",
        home: 2,
        away: 1
      }
    ]);

    await httpPredictionsRepository.savePrediction({
      groupId: testGroupId,
      fecha: "1",
      prediction: {
        fixtureId: "fx-1",
        home: 2,
        away: 1
      }
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3000/api/pronosticos",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          period: "1",
          groupId: testGroupId,
          matchId: "fx-1",
          home: 2,
          away: 1
        })
      })
    );
  });
});

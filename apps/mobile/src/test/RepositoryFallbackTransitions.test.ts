import { authRepository, fixtureRepository, leaderboardRepository, predictionsRepository } from "@/repositories";
import { canUseHttpSession, setUseHttpSession } from "@/repositories/authBridgeState";
import { httpAuthRepository } from "@/repositories/httpAuthRepository";
import { httpFixtureRepository, httpLeaderboardRepository, httpPredictionsRepository } from "@/repositories/httpDataRepositories";
import { mockAuthRepository } from "@/repositories/mockAuthRepository";
import { mockLeaderboardRepository, mockPredictionsRepository } from "@/repositories/mockDataRepositories";
import { clearFallbackFailure, reportFallbackFailure } from "@/repositories/fallbackDiagnostics";

jest.mock("@/repositories/httpAuthRepository", () => ({
  httpAuthRepository: {
    getSession: jest.fn(),
    loginWithPassword: jest.fn(),
    loginWithGoogleIdToken: jest.fn(),
    registerWithPassword: jest.fn(),
    requestPasswordReset: jest.fn(),
    changePassword: jest.fn(),
    deleteAccount: jest.fn(),
    logout: jest.fn()
  }
}));

jest.mock("@/repositories/httpDataRepositories", () => ({
  httpPredictionsRepository: {
    listPredictions: jest.fn(),
    savePrediction: jest.fn()
  },
  httpFixtureRepository: {
    listFixture: jest.fn()
  },
  httpLeaderboardRepository: {
    getLeaderboard: jest.fn(),
    getLeaderboardPayload: jest.fn()
  },
  httpGroupsRepository: {
    listGroups: jest.fn(),
    listMemberships: jest.fn(),
    createGroup: jest.fn(),
    joinGroup: jest.fn()
  }
}));

jest.mock("@/repositories/mockAuthRepository", () => ({
  mockAuthRepository: {
    getSession: jest.fn(),
    loginWithPassword: jest.fn(),
    loginWithGoogleIdToken: jest.fn(),
    registerWithPassword: jest.fn(),
    requestPasswordReset: jest.fn(),
    changePassword: jest.fn(),
    deleteAccount: jest.fn(),
    logout: jest.fn()
  }
}));

jest.mock("@/repositories/mockDataRepositories", () => ({
  mockPredictionsRepository: {
    listPredictions: jest.fn(),
    savePrediction: jest.fn()
  },
  mockLeaderboardRepository: {
    getLeaderboard: jest.fn(),
    getLeaderboardPayload: jest.fn()
  },
  mockGroupsRepository: {
    listGroups: jest.fn(),
    listMemberships: jest.fn(),
    createGroup: jest.fn(),
    joinGroup: jest.fn()
  }
}));

jest.mock("@/repositories/fallbackDiagnostics", () => ({
  clearFallbackFailure: jest.fn(),
  reportFallbackFailure: jest.fn()
}));

const mockedHttpAuth = httpAuthRepository as unknown as {
  getSession: jest.Mock;
  logout: jest.Mock;
};

const mockedMockAuth = mockAuthRepository as unknown as {
  getSession: jest.Mock;
  logout: jest.Mock;
};

const mockedHttpPredictions = httpPredictionsRepository as unknown as {
  listPredictions: jest.Mock;
};
const mockedHttpFixture = httpFixtureRepository as unknown as {
  listFixture: jest.Mock;
};
const mockedHttpLeaderboard = httpLeaderboardRepository as unknown as {
  getLeaderboard: jest.Mock;
  getLeaderboardPayload: jest.Mock;
};

const mockedMockPredictions = mockPredictionsRepository as unknown as {
  listPredictions: jest.Mock;
};
const mockedMockLeaderboard = mockLeaderboardRepository as unknown as {
  getLeaderboard: jest.Mock;
  getLeaderboardPayload: jest.Mock;
};

const mockedClearFallback = clearFallbackFailure as unknown as jest.Mock;
const mockedReportFallback = reportFallbackFailure as unknown as jest.Mock;

describe("Repository fallback transitions", () => {
  const originalMockFallbackFlag = process.env.EXPO_PUBLIC_ENABLE_MOCK_FALLBACK;

  beforeEach(() => {
    jest.clearAllMocks();
    setUseHttpSession(false);
    process.env.EXPO_PUBLIC_ENABLE_MOCK_FALLBACK = "true";
  });

  afterAll(() => {
    if (originalMockFallbackFlag === undefined) {
      delete process.env.EXPO_PUBLIC_ENABLE_MOCK_FALLBACK;
      return;
    }
    process.env.EXPO_PUBLIC_ENABLE_MOCK_FALLBACK = originalMockFallbackFlag;
  });

  it("keeps HTTP mode on successful auth session fetch", async () => {
    const session = {
      user: { id: "u-1", email: "qa@example.com", name: "QA" },
      memberships: []
    };
    mockedHttpAuth.getSession.mockResolvedValue(session);

    const result = await authRepository.getSession();

    expect(result).toEqual(session);
    expect(canUseHttpSession()).toBe(true);
    expect(mockedClearFallback).toHaveBeenCalledTimes(1);
    expect(mockedReportFallback).not.toHaveBeenCalled();
  });

  it("falls back to mock auth and records diagnostics when HTTP auth fails", async () => {
    const fallbackError = new Error("HTTP 500");
    const mockSession = {
      user: { id: "u-mock", email: "mock@example.com", name: "Mock User" },
      memberships: []
    };
    setUseHttpSession(true);
    mockedHttpAuth.getSession.mockRejectedValue(fallbackError);
    mockedMockAuth.getSession.mockResolvedValue(mockSession);

    const result = await authRepository.getSession();

    expect(result).toEqual(mockSession);
    expect(canUseHttpSession()).toBe(false);
    expect(mockedReportFallback).toHaveBeenCalledWith("auth.getSession", fallbackError);
    expect(mockedClearFallback).not.toHaveBeenCalled();
  });

  it("transitions predictions calls from HTTP failure to mock fallback and clears diagnostics after recovery", async () => {
    const fallbackError = new Error("HTTP 503");
    const fallbackRows = [{ fixtureId: "fx-1", home: 1, away: 0 }];
    const httpRows = [{ fixtureId: "fx-2", home: 2, away: 1 }];

    setUseHttpSession(true);
    mockedHttpPredictions.listPredictions.mockRejectedValueOnce(fallbackError);
    mockedMockPredictions.listPredictions.mockResolvedValueOnce(fallbackRows);

    const fallbackResult = await predictionsRepository.listPredictions({
      groupId: "g-1",
      fecha: "1"
    });

    expect(fallbackResult).toEqual(fallbackRows);
    expect(mockedReportFallback).toHaveBeenCalledWith("predictions.listPredictions", fallbackError);

    mockedHttpPredictions.listPredictions.mockResolvedValueOnce(httpRows);

    const recoveredResult = await predictionsRepository.listPredictions({
      groupId: "g-1",
      fecha: "1"
    });

    expect(recoveredResult).toEqual(httpRows);
    expect(mockedClearFallback).toHaveBeenCalled();
  });

  it("forces mock mode during logout even when HTTP logout fails", async () => {
    setUseHttpSession(true);
    const logoutError = new Error("HTTP 502");
    mockedHttpAuth.logout.mockRejectedValue(logoutError);
    mockedMockAuth.logout.mockResolvedValue(undefined);

    await authRepository.logout();

    expect(canUseHttpSession()).toBe(false);
    expect(mockedReportFallback).toHaveBeenCalledWith("auth.logout", logoutError);
    expect(mockedMockAuth.logout).toHaveBeenCalledTimes(1);
  });

  it("surfaces fixture HTTP payload errors without mock fallback", async () => {
    const fallbackError = new Error("malformed fixture payload");
    setUseHttpSession(true);
    mockedHttpFixture.listFixture.mockRejectedValueOnce(fallbackError);

    await expect(fixtureRepository.listFixture({ groupId: "g-1", fecha: "3" })).rejects.toThrow("malformed fixture payload");
    expect(mockedReportFallback).toHaveBeenCalledWith("fixture.listFixture", fallbackError);
    expect(mockedClearFallback).not.toHaveBeenCalled();
  });

  it("falls back to mock leaderboard rows when HTTP leaderboard payload handling throws", async () => {
    const fallbackError = new Error("malformed leaderboard payload");
    const fallbackRows = [{ userId: "mock-u-1", displayName: "Mock User", points: 10, rank: 1 }];
    setUseHttpSession(true);
    mockedHttpLeaderboard.getLeaderboard.mockRejectedValueOnce(fallbackError);
    mockedMockLeaderboard.getLeaderboard.mockResolvedValueOnce(fallbackRows);

    const result = await leaderboardRepository.getLeaderboard({ groupId: "g-1", fecha: "3" });

    expect(result).toEqual(fallbackRows);
    expect(mockedReportFallback).toHaveBeenCalledWith("leaderboard.getLeaderboard", fallbackError);
  });

  it("falls back to mock leaderboard stats payload when HTTP payload request fails", async () => {
    const fallbackError = new Error("leaderboard stats unavailable");
    const fallbackPayload = {
      groupLabel: "Grupo Mock",
      mode: "stats",
      period: "global",
      periodLabel: "Global acumulado",
      updatedAt: "2026-03-08T00:00:00.000Z",
      rows: [],
      groupStats: null,
      stats: {
        summary: {
          memberCount: 1,
          scoredPredictions: 0,
          correctPredictions: 0,
          exactPredictions: 0,
          resultPredictions: 0,
          missPredictions: 0,
          accuracyPct: 0,
          totalPoints: 0,
          averageMemberPoints: 0,
          bestRound: null,
          worstRound: null,
          worldBenchmark: null
        },
        awards: [],
        historicalSeries: []
      }
    };

    setUseHttpSession(true);
    mockedHttpLeaderboard.getLeaderboardPayload.mockRejectedValueOnce(fallbackError);
    mockedMockLeaderboard.getLeaderboardPayload.mockResolvedValueOnce(fallbackPayload);

    const result = await leaderboardRepository.getLeaderboardPayload({
      groupId: "g-1",
      fecha: "global",
      mode: "stats"
    });

    expect(result).toEqual(fallbackPayload);
    expect(mockedReportFallback).toHaveBeenCalledWith("leaderboard.getLeaderboardPayload", fallbackError);
  });
});

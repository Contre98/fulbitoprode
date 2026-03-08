import { mockGroupsRepository, mockPredictionsRepository, mockProfileRepository } from "@/repositories/mockDataRepositories";
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
        method: "POST"
      })
    );
    expectNoCookieCredentials(fetchMock, 0);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3000/api/groups/join",
      expect.objectContaining({
        method: "POST"
      })
    );
    expectNoCookieCredentials(fetchMock, 1);
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
        body: JSON.stringify({
          period: "1",
          groupId: testGroupId,
          matchId: "fx-1",
          home: 2,
          away: 1
        })
      })
    );
    expectNoCookieCredentials(fetchMock, 1);
  });

  it("maps profile payload to the shared mobile contract in HTTP and mock adapters", async () => {
    const fetchMock = jest.fn<Promise<MockResponse>, [string, RequestInit | undefined]>();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        stats: { totalPoints: 21, accuracyPct: 67, groups: 2 },
        recentActivity: [
          {
            id: "pred:http-1",
            type: "prediction",
            label: "Pronóstico: Boca Juniors vs Racing Club",
            occurredAt: "2026-03-08T00:00:00.000Z",
            points: 3
          }
        ],
        updatedAt: "2026-03-08T00:00:00.000Z"
      })
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;
    const { httpProfileRepository } = require("@/repositories/httpDataRepositories");

    const httpPayload = await httpProfileRepository.getProfile();
    const mockPayload = await mockProfileRepository.getProfile();

    [httpPayload, mockPayload].forEach((payload) => {
      expect(payload).toEqual(
        expect.objectContaining({
          stats: expect.objectContaining({
            totalPoints: expect.any(Number),
            accuracyPct: expect.any(Number),
            groups: expect.any(Number)
          }),
          recentActivity: expect.any(Array),
          updatedAt: expect.any(String)
        })
      );
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3000/api/profile",
      expect.any(Object)
    );
    expectNoCookieCredentials(fetchMock, 0);
  });

  it("sends profile updates to /api/auth/me and returns a shared user shape", async () => {
    const fetchMock = jest.fn<Promise<MockResponse>, [string, RequestInit | undefined]>();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        user: {
          id: "u-http",
          name: "QA HTTP",
          username: "qa-http",
          email: "qa-http@example.com",
          favoriteTeam: "San Lorenzo"
        }
      })
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;
    const { httpProfileRepository } = require("@/repositories/httpDataRepositories");

    const httpUser = await httpProfileRepository.updateProfile({
      name: "QA HTTP",
      username: "qa-http",
      email: "qa-http@example.com",
      favoriteTeam: "San Lorenzo"
    });
    const mockUser = await mockProfileRepository.updateProfile({
      name: "QA Mock",
      username: "qa-mock",
      email: "qa-mock@example.com"
    });

    [httpUser, mockUser].forEach((user) => {
      expect(user).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          email: expect.any(String)
        })
      );
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3000/api/auth/me",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          name: "QA HTTP",
          username: "qa-http",
          email: "qa-http@example.com",
          favoriteTeam: "San Lorenzo"
        })
      })
    );
    expectNoCookieCredentials(fetchMock, 0);
  });

  it("supports members/invite/leave/delete group admin contracts across HTTP and mock adapters", async () => {
    const groupId = "g-http-admin";
    const fetchMock = jest.fn<Promise<MockResponse>, [string, RequestInit | undefined]>();
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          members: [{ userId: "u-1", name: "Usuario Uno", role: "owner", joinedAt: "2026-01-01T00:00:00.000Z" }],
          viewerRole: "owner",
          canManage: true
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          changed: true,
          member: { userId: "u-2", name: "Usuario Dos", role: "admin", joinedAt: "2026-01-02T00:00:00.000Z" }
        })
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ok: true }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ok: true, deletedGroup: false }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ok: true, warningRequired: false }) })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          invite: { code: "INV-ABC123", token: "token-abc123", expiresAt: "2026-03-15T00:00:00.000Z" },
          canRefresh: true,
          inviteUrl: "http://localhost:3000/configuracion?invite=token-abc123"
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          invite: { code: "INV-NEW123", token: "token-new123", expiresAt: "2026-03-20T00:00:00.000Z" }
        })
      });
    global.fetch = fetchMock as unknown as typeof global.fetch;
    const { httpGroupsRepository } = require("@/repositories/httpDataRepositories");

    const httpMembers = await httpGroupsRepository.listMembers({ groupId });
    const httpRoleUpdate = await httpGroupsRepository.updateMemberRole({ groupId, userId: "u-2", role: "admin" });
    const httpRemove = await httpGroupsRepository.removeMember({ groupId, userId: "u-2" });
    const httpLeave = await httpGroupsRepository.leaveGroup({ groupId });
    const httpDelete = await httpGroupsRepository.deleteGroup({ groupId });
    const httpInvite = await httpGroupsRepository.getInvite({ groupId });
    const httpRefresh = await httpGroupsRepository.refreshInvite({ groupId });

    const mockMembers = await mockGroupsRepository.listMembers({ groupId: "g-mock-admin" });
    const mockRoleUpdate = await mockGroupsRepository.updateMemberRole({
      groupId: "g-mock-admin",
      userId: mockMembers.members[1]?.userId ?? "u-mock-member",
      role: "admin"
    });
    const mockRemove = await mockGroupsRepository.removeMember({
      groupId: "g-mock-admin",
      userId: mockMembers.members[1]?.userId ?? "u-mock-member"
    });
    const mockLeave = await mockGroupsRepository.leaveGroup({ groupId: "g-mock-admin" });
    const mockDelete = await mockGroupsRepository.deleteGroup({ groupId: "g-mock-admin" });
    const mockInvite = await mockGroupsRepository.getInvite({ groupId: "g-mock-admin" });
    const mockRefresh = await mockGroupsRepository.refreshInvite({ groupId: "g-mock-admin" });

    [httpMembers, mockMembers].forEach((payload) => {
      expect(payload).toEqual(
        expect.objectContaining({
          members: expect.any(Array),
          viewerRole: expect.any(String),
          canManage: expect.any(Boolean)
        })
      );
    });
    [httpRoleUpdate, mockRoleUpdate].forEach((payload) => {
      expect(payload).toEqual(
        expect.objectContaining({
          ok: true,
          changed: expect.any(Boolean),
          member: expect.objectContaining({
            userId: expect.any(String),
            role: expect.any(String)
          })
        })
      );
    });
    [httpRemove, mockRemove, httpLeave, mockLeave, httpDelete, mockDelete].forEach((payload) => {
      expect(payload).toEqual(expect.objectContaining({ ok: true }));
    });
    [httpInvite, mockInvite].forEach((payload) => {
      expect(payload).toEqual(
        expect.objectContaining({
          canRefresh: expect.any(Boolean)
        })
      );
    });
    [httpRefresh, mockRefresh].forEach((payload) => {
      expect(payload).toEqual(
        expect.objectContaining({
          ok: true,
          invite: expect.objectContaining({
            code: expect.any(String),
            token: expect.any(String),
            expiresAt: expect.any(String)
          })
        })
      );
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `http://localhost:3000/api/groups/${groupId}/members`,
      expect.any(Object)
    );
    expectNoCookieCredentials(fetchMock, 0);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `http://localhost:3000/api/groups/${groupId}/members`,
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ userId: "u-2", role: "admin" })
      })
    );
    expectNoCookieCredentials(fetchMock, 1);
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      `http://localhost:3000/api/groups/${groupId}/members`,
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ userId: "u-2" })
      })
    );
    expectNoCookieCredentials(fetchMock, 2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "http://localhost:3000/api/groups/leave",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ groupId })
      })
    );
    expectNoCookieCredentials(fetchMock, 3);
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      `http://localhost:3000/api/groups/${groupId}`,
      expect.objectContaining({
        method: "DELETE"
      })
    );
    expectNoCookieCredentials(fetchMock, 4);
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      `http://localhost:3000/api/groups/${groupId}/invite`,
      expect.any(Object)
    );
    expectNoCookieCredentials(fetchMock, 5);
    expect(fetchMock).toHaveBeenNthCalledWith(
      7,
      `http://localhost:3000/api/groups/${groupId}/invite/refresh`,
      expect.objectContaining({
        method: "POST"
      })
    );
    expectNoCookieCredentials(fetchMock, 6);
  });
});

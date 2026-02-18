import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/profile/route";

const mockUserId: string | null = "u1";
const mockPbToken: string | null = "pb-token";
const listGroupsForUserMock = vi.fn();
const listGroupPredictionsForGroupsMock = vi.fn();
const fetchLigaArgentinaFixturesMock = vi.fn();

vi.mock("@/lib/request-auth", () => ({
  getSessionUserIdFromRequest: () => mockUserId,
  getSessionPocketBaseTokenFromRequest: () => mockPbToken
}));

vi.mock("@/lib/m3-repo", () => ({
  listGroupsForUser: (...args: unknown[]) => listGroupsForUserMock(...args),
  listGroupPredictionsForGroups: (...args: unknown[]) => listGroupPredictionsForGroupsMock(...args)
}));

vi.mock("@/lib/liga-live-provider", () => ({
  fetchLigaArgentinaFixtures: (input: unknown) => fetchLigaArgentinaFixturesMock(input)
}));

describe("GET /api/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns global stats and recent activity from real records", async () => {
    listGroupsForUserMock.mockResolvedValueOnce([
      {
        group: {
          id: "g1",
          name: "Los Galácticos",
          leagueId: 128,
          season: "2026",
          competitionStage: "apertura"
        },
        membership: {
          joinedAt: "2026-01-10T10:00:00.000Z"
        }
      },
      {
        group: {
          id: "g2",
          name: "Los Titanes",
          leagueId: 128,
          season: "2026",
          competitionStage: "apertura"
        },
        membership: {
          joinedAt: "2026-01-09T10:00:00.000Z"
        }
      }
    ]);

    listGroupPredictionsForGroupsMock.mockResolvedValueOnce({
      g1: [
        {
          userId: "u1",
          fixtureId: "fx-1",
          period: "Fecha 1",
          home: 1,
          away: 0,
          submittedAt: "2026-02-17T10:00:00.000Z"
        }
      ],
      g2: [
        {
          userId: "u1",
          fixtureId: "fx-2",
          period: "Fecha 1",
          home: 0,
          away: 0,
          submittedAt: "2026-02-16T10:00:00.000Z"
        },
        {
          userId: "u2",
          fixtureId: "fx-3",
          period: "Fecha 1",
          home: 1,
          away: 1,
          submittedAt: "2026-02-16T09:00:00.000Z"
        }
      ]
    });

    fetchLigaArgentinaFixturesMock.mockResolvedValueOnce([
      {
        id: "fx-1",
        homeName: "Boca",
        awayName: "River",
        homeGoals: 1,
        awayGoals: 0
      },
      {
        id: "fx-2",
        homeName: "Racing",
        awayName: "Independiente",
        homeGoals: 2,
        awayGoals: 1
      }
    ]);

    const response = await GET(new Request("http://localhost/api/profile"));
    expect(response.status).toBe(200);

    const payload = (await response.json()) as {
      stats: { totalPoints: number; accuracyPct: number; groups: number };
      recentActivity: Array<{ label: string; type: string }>;
    };

    expect(payload.stats.totalPoints).toBe(3);
    expect(payload.stats.accuracyPct).toBe(50);
    expect(payload.stats.groups).toBe(2);
    expect(payload.recentActivity.some((item) => item.label.includes("Pronóstico: Boca vs River"))).toBe(true);
    expect(payload.recentActivity.some((item) => item.label.includes("Te uniste a Los Galácticos"))).toBe(true);
  });
});

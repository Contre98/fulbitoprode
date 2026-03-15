import type {
  FixtureRepository,
  GroupInvitePayload,
  GroupInviteRefreshPayload,
  GroupLeavePayload,
  GroupMemberRecord,
  GroupMemberUpdatePayload,
  GroupMembersPayload,
  GroupSearchPage,
  GroupsRepository,
  LeaderboardApiPayload,
  LeaderboardRepository,
  NotificationsRepository,
  ProfileRepository,
  PredictionsRepository
} from "@fulbito/api-contracts";
import type { GroupSearchResult, NotificationItem, NotificationPreferences, User, WeeklyWinnerSummary } from "@fulbito/domain";
import { createMockGroup, joinMockGroup, listMockGroups, listMockMemberships, renameMockGroup } from "@/repositories/mockGroupStore";

export const mockGroupsRepository: GroupsRepository = {
  async listGroups() {
    return listMockGroups();
  },
  async listMemberships() {
    return listMockMemberships();
  },
  async searchGroups(input) {
    const groups = listMockGroups();
    const results: GroupSearchResult[] = groups
      .filter((g) => {
        if (input.query && !g.name.toLowerCase().includes(input.query.toLowerCase())) return false;
        if (typeof input.leagueId === "number" && g.leagueId !== input.leagueId) return false;
        return true;
      })
      .map((g) => ({
        id: g.id,
        name: g.name,
        leagueId: g.leagueId,
        leagueName: "Liga Profesional",
        season: g.season,
        competitionName: "LPF: Apertura (2026)",
        competitionStage: "apertura" as const,
        visibility: "open" as const,
        memberCount: 3,
        maxMembers: null
      }));
    const page = Number.isFinite(input.page) ? Math.max(1, Math.floor(input.page as number)) : 1;
    const perPage = Number.isFinite(input.perPage) ? Math.max(1, Math.floor(input.perPage as number)) : 20;
    const totalItems = results.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
    const startIndex = (page - 1) * perPage;
    const groupsPage = results.slice(startIndex, startIndex + perPage);

    return {
      groups: groupsPage,
      page,
      perPage,
      totalItems,
      totalPages,
      hasMore: page < totalPages
    } satisfies GroupSearchPage;
  },
  async createGroup(input) {
    return createMockGroup(input);
  },
  async joinGroup(input) {
    const group = await joinMockGroup(input);
    return { group, status: "joined" as const };
  },
  async updateGroupName(input) {
    return renameMockGroup(input);
  },
  async listMembers(input) {
    const members = ensureMockGroupMembers(input.groupId);
    return {
      members: [...members],
      viewerRole: "owner",
      canManage: true
    } satisfies GroupMembersPayload;
  },
  async updateMemberRole(input) {
    const members = ensureMockGroupMembers(input.groupId);
    const index = members.findIndex((member) => member.userId === input.userId);
    if (index < 0) {
      throw new Error("Member not found");
    }
    const updatedMember: GroupMemberRecord = {
      ...members[index],
      role: input.role
    };
    members[index] = updatedMember;
    mockMembersByGroupId.set(input.groupId, members);
    return {
      ok: true,
      changed: true,
      member: updatedMember
    } satisfies GroupMemberUpdatePayload;
  },
  async removeMember(input) {
    const members = ensureMockGroupMembers(input.groupId);
    mockMembersByGroupId.set(
      input.groupId,
      members.filter((member) => member.userId !== input.userId)
    );
    return { ok: true } as const;
  },
  async leaveGroup() {
    return {
      ok: true,
      deletedGroup: false
    } satisfies GroupLeavePayload;
  },
  async deleteGroup(input) {
    mockMembersByGroupId.delete(input.groupId);
    mockInvitesByGroupId.delete(input.groupId);
    return { ok: true, warningRequired: false } as const;
  },
  async getInvite(input) {
    const invite = ensureMockInvite(input.groupId);
    return {
      invite,
      canRefresh: true,
      inviteUrl: `https://fulbito.local/join?invite=${encodeURIComponent(invite.token)}`
    } satisfies GroupInvitePayload;
  },
  async refreshInvite(input) {
    const invite = createMockInvite(input.groupId, Date.now() + 1);
    mockInvitesByGroupId.set(input.groupId, invite);
    return {
      ok: true,
      invite
    } satisfies GroupInviteRefreshPayload;
  },
  async listJoinRequests() {
    return { requests: [] };
  },
  async respondToJoinRequest() {
    return { ok: true as const };
  }
};

const mockMembersByGroupId = new Map<string, GroupMemberRecord[]>();
const mockInvitesByGroupId = new Map<string, { code: string; token: string; expiresAt: string }>();

const asdGroupMembers: GroupMemberRecord[] = [
  {
    userId: "u-mock-owner",
    name: "Usuario Fulbito",
    role: "owner",
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString()
  },
  {
    userId: "u-mock-2",
    name: "Gonzalo Ramirez",
    role: "member",
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString()
  },
  {
    userId: "u-mock-3",
    name: "Luciana Torres",
    role: "member",
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString()
  },
  {
    userId: "u-mock-4",
    name: "Matias Fernandez",
    role: "member",
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString()
  },
  {
    userId: "u-mock-5",
    name: "Sofia Diaz",
    role: "member",
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString()
  },
  {
    userId: "u-mock-6",
    name: "Rodrigo Perez",
    role: "member",
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString()
  }
];

function ensureMockGroupMembers(groupId: string) {
  const existing = mockMembersByGroupId.get(groupId);
  if (existing) {
    return existing;
  }
  const seeded: GroupMemberRecord[] =
    groupId === "grupo-asd"
      ? [...asdGroupMembers]
      : [
          {
            userId: "u-mock-owner",
            name: "Usuario Fulbito",
            role: "owner",
            joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString()
          },
          {
            userId: "u-mock-member",
            name: "Amigo Fulbito",
            role: "member",
            joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString()
          }
        ];
  mockMembersByGroupId.set(groupId, seeded);
  return seeded;
}

function createMockInvite(groupId: string, seed = Date.now()) {
  const suffix = Math.abs(seed).toString(36).slice(-6).toUpperCase();
  return {
    code: `INV-${suffix}`,
    token: `token-${groupId}-${suffix.toLowerCase()}`,
    expiresAt: new Date(seed + 1000 * 60 * 60 * 24 * 7).toISOString()
  };
}

function ensureMockInvite(groupId: string) {
  const existing = mockInvitesByGroupId.get(groupId);
  if (existing) {
    return existing;
  }
  const seeded = createMockInvite(groupId);
  mockInvitesByGroupId.set(groupId, seeded);
  return seeded;
}

const predictionsByKey = new Map<string, { fixtureId: string; home: number; away: number }[]>([
  // grupo-asd — Fecha 1 (2026-01): 6 finales + 1 upcoming
  [
    "grupo-asd:2026-01",
    [
      { fixtureId: "fx-def-bel-final", home: 1, away: 1 },  // exact (3 pts) — actual 1-1
      { fixtureId: "fx-est-sar-final", home: 2, away: 0 },  // result (1 pt)  — actual 1-0
      { fixtureId: "fx-boc-rac-final", home: 1, away: 0 },  // miss  (0 pts)  — actual 0-0
      { fixtureId: "fx-ins-atl-final", home: 2, away: 1 },  // exact (3 pts) — actual 2-1
      { fixtureId: "fx-ros-tal-final", home: 1, away: 1 },  // miss  (0 pts)  — actual 0-1
      { fixtureId: "fx-gim-gimj-final", home: 0, away: 0 }, // exact (3 pts) — actual 0-0
      { fixtureId: "fx-arg-lan-upcoming", home: 2, away: 1 } // upcoming, no result yet
    ]
  ]
]);

export const mockPredictionsRepository: PredictionsRepository = {
  async listPredictions(input) {
    const key = `${input.groupId}:${input.fecha}`;
    return predictionsByKey.get(key) ?? [];
  },
  async savePrediction(input) {
    const key = `${input.groupId}:${input.fecha}`;
    const rows = predictionsByKey.get(key) ?? [];
    const filtered = rows.filter((row) => row.fixtureId !== input.prediction.fixtureId);
    predictionsByKey.set(key, [...filtered, input.prediction]);
  }
};

export const mockFixtureRepository: FixtureRepository = {
  async listFixture() {
    const now = Date.now();
    const finalsBase = now - 1000 * 60 * 60 * 48;
    return [
      {
        id: "fx-arg-lan-upcoming",
        homeTeam: "Argentinos Juniors",
        awayTeam: "Lanús",
        kickoffAt: new Date(now + 1000 * 60 * 60 * 24 * 2).toISOString(),
        status: "upcoming"
      },
      {
        id: "fx-def-bel-final",
        homeTeam: "Defensa Y Justicia",
        awayTeam: "Belgrano Cordoba",
        kickoffAt: new Date(finalsBase).toISOString(),
        status: "final",
        score: {
          home: 1,
          away: 1
        }
      },
      {
        id: "fx-est-sar-final",
        homeTeam: "Estudiantes L.P.",
        awayTeam: "Sarmiento Junin",
        kickoffAt: new Date(finalsBase + 1000 * 60 * 45).toISOString(),
        status: "final",
        score: {
          home: 1,
          away: 0
        }
      },
      {
        id: "fx-boc-rac-final",
        homeTeam: "Boca Juniors",
        awayTeam: "Racing Club",
        kickoffAt: new Date(finalsBase + 1000 * 60 * 90).toISOString(),
        status: "final",
        score: {
          home: 0,
          away: 0
        }
      },
      {
        id: "fx-ins-atl-final",
        homeTeam: "Instituto Cordoba",
        awayTeam: "Atletico Tucuman",
        kickoffAt: new Date(finalsBase + 1000 * 60 * 135).toISOString(),
        status: "final",
        score: {
          home: 2,
          away: 1
        }
      },
      {
        id: "fx-ros-tal-final",
        homeTeam: "Rosario Central",
        awayTeam: "Talleres Cordoba",
        kickoffAt: new Date(finalsBase + 1000 * 60 * 180).toISOString(),
        status: "final",
        score: {
          home: 0,
          away: 1
        }
      },
      {
        id: "fx-gim-gimj-final",
        homeTeam: "Gimnasia M",
        awayTeam: "Gimnasia L. P.",
        kickoffAt: new Date(finalsBase + 1000 * 60 * 225).toISOString(),
        status: "final",
        score: {
          home: 0,
          away: 0
        }
      }
    ];
  }
};

const asdLeaderboardRows: LeaderboardApiPayload["rows"] = [
  { userId: "u-mock-2", name: "Gonzalo Ramirez", rank: 1, predictions: 8, record: "5/3/0", points: 21, highlight: false, deltaRank: 0, streak: 5 },
  { userId: "u-mock-owner", name: "Usuario Fulbito", rank: 2, predictions: 8, record: "5/2/1", points: 18, highlight: true, deltaRank: 2, streak: 3 },
  { userId: "u-mock-3", name: "Luciana Torres", rank: 3, predictions: 7, record: "4/3/0", points: 15, highlight: false, deltaRank: -1, streak: 0 },
  { userId: "u-mock-5", name: "Sofia Diaz", rank: 4, predictions: 8, record: "3/3/2", points: 12, highlight: false, deltaRank: 1, streak: 2 },
  { userId: "u-mock-4", name: "Matias Fernandez", rank: 5, predictions: 6, record: "3/2/1", points: 11, highlight: false, deltaRank: -2, streak: 0 },
  { userId: "u-mock-6", name: "Rodrigo Perez", rank: 6, predictions: 5, record: "2/2/1", points: 8, highlight: false, deltaRank: 0, streak: 1 }
];

export const mockLeaderboardRepository: LeaderboardRepository = {
  async getLeaderboardPayload(input) {
    const mode = input.mode === "stats" ? "stats" : "posiciones";
    const isAsd = input.groupId === "grupo-asd";

    const rows: LeaderboardApiPayload["rows"] = isAsd
      ? asdLeaderboardRows.map((r) => ({ ...r, points: mode === "stats" ? r.points * 5 : r.points }))
      : [
          {
            userId: "user-1",
            name: "Usuario Fulbito",
            rank: 1,
            predictions: 8,
            record: "6/2/0",
            points: mode === "stats" ? 92 : 18,
            highlight: true
          }
        ];

    const memberCount = isAsd ? 6 : 1;
    const groupLabel = isAsd ? "asd" : "Grupo Amigos";
    const topUser = rows[0];

    return {
      groupLabel,
      mode,
      period: input.fecha || "global",
      periodLabel: input.fecha || "Global acumulado",
      updatedAt: new Date().toISOString(),
      rows,
      groupStats:
        mode === "stats"
          ? {
              memberCount,
              scoredPredictions: isAsd ? 42 : 8,
              correctPredictions: isAsd ? 30 : 8,
              exactPredictions: isAsd ? 22 : 6,
              resultPredictions: isAsd ? 8 : 2,
              missPredictions: isAsd ? 12 : 0,
              accuracyPct: isAsd ? 71 : 100,
              totalPoints: isAsd ? 85 : 18,
              averageMemberPoints: isAsd ? 14 : 18,
              bestFecha: {
                period: "Fecha 3",
                periodLabel: "Fecha 3",
                userId: topUser.userId ?? "u-mock-2",
                userName: topUser.name,
                points: 12
              },
              worstFecha: {
                period: "Fecha 1",
                periodLabel: "Fecha 1",
                userId: "u-mock-6",
                userName: "Rodrigo Perez",
                points: 3
              },
              worldBenchmark: null
            }
          : null,
      stats:
        mode === "stats"
          ? {
              summary: {
                memberCount,
                scoredPredictions: isAsd ? 42 : 8,
                correctPredictions: isAsd ? 30 : 8,
                exactPredictions: isAsd ? 22 : 6,
                resultPredictions: isAsd ? 8 : 2,
                missPredictions: isAsd ? 12 : 0,
                accuracyPct: isAsd ? 71 : 100,
                totalPoints: isAsd ? 85 : 18,
                averageMemberPoints: isAsd ? 14 : 18,
                bestRound: {
                  period: "Fecha 3",
                  periodLabel: "Fecha 3",
                  userId: topUser.userId ?? "u-mock-2",
                  userName: topUser.name,
                  points: 12
                },
                worstRound: {
                  period: "Fecha 1",
                  periodLabel: "Fecha 1",
                  userId: "u-mock-6",
                  userName: "Rodrigo Perez",
                  points: 3
                },
                worldBenchmark: null
              },
              awards: [
                {
                  id: "nostradamus",
                  title: "NOSTRADAMUS",
                  winnerUserId: topUser.userId ?? "u-mock-2",
                  winnerName: topUser.name,
                  subtitle: isAsd ? "Mayor cantidad de plenos (5)" : "Mayor cantidad de plenos (6)",
                  metricValue: isAsd ? 5 : 6
                }
              ],
              historicalSeries: isAsd
                ? [
                    { userId: "u-mock-2", userName: "Gonzalo Ramirez", points: [{ period: "Fecha 1", periodLabel: "Fecha 1", rank: 2, points: 6 }, { period: "Fecha 2", periodLabel: "Fecha 2", rank: 1, points: 8 }, { period: "Fecha 3", periodLabel: "Fecha 3", rank: 1, points: 7 }] },
                    { userId: "u-mock-owner", userName: "Usuario Fulbito", points: [{ period: "Fecha 1", periodLabel: "Fecha 1", rank: 1, points: 7 }, { period: "Fecha 2", periodLabel: "Fecha 2", rank: 2, points: 5 }, { period: "Fecha 3", periodLabel: "Fecha 3", rank: 2, points: 6 }] },
                    { userId: "u-mock-3", userName: "Luciana Torres", points: [{ period: "Fecha 1", periodLabel: "Fecha 1", rank: 3, points: 5 }, { period: "Fecha 2", periodLabel: "Fecha 2", rank: 3, points: 5 }, { period: "Fecha 3", periodLabel: "Fecha 3", rank: 3, points: 5 }] }
                  ]
                : [
                    { userId: "user-1", userName: "Usuario Fulbito", points: [{ period: "Fecha 1", periodLabel: "Fecha 1", rank: 1, points: 9 }, { period: "Fecha 2", periodLabel: "Fecha 2", rank: 1, points: 9 }] }
                  ],
              userSection: {
                userId: isAsd ? "u-mock-owner" : "user-1",
                userName: "Usuario Fulbito",
                precisionPct: isAsd ? 70 : 100,
                exactPct: isAsd ? 45 : 75,
                averagePointsPerRound: isAsd ? 6 : 9,
                trend: {
                  accuracyPctDelta: isAsd ? 4 : 0,
                  pointsPerRoundDelta: isAsd ? 0.6 : 0
                },
                consistencyStdDev: isAsd ? 1.3 : 0,
                nearMissRatePct: isAsd ? 17 : 8,
                homeAccuracyPct: isAsd ? 68 : 100,
                awayAccuracyPct: isAsd ? 63 : 100
              },
              groupSection: {
                precisionPct: isAsd ? 71 : 100,
                pointsDistribution: {
                  p25: isAsd ? 4.6 : 9,
                  median: isAsd ? 5.2 : 9,
                  p75: isAsd ? 6.6 : 9
                },
                parityGapTopVsMedian: isAsd ? 1.8 : 0,
                difficultyIndexAvgPointsPerRound: isAsd ? 5.4 : 9,
                consensusHitPct: isAsd ? 62 : 100,
                advantageOpportunityCount: isAsd ? 3 : 0,
                activeParticipationPct: 100,
                bestRound: {
                  period: "Fecha 3",
                  periodLabel: "Fecha 3",
                  userId: topUser.userId ?? "u-mock-2",
                  userName: topUser.name,
                  points: 12
                },
                worstRound: {
                  period: "Fecha 1",
                  periodLabel: "Fecha 1",
                  userId: "u-mock-6",
                  userName: "Rodrigo Perez",
                  points: 3
                }
              },
              comparatives: {
                vsMedianAccuracyPct: isAsd ? 5 : 0,
                vsMedianPointsPerRound: isAsd ? 0.8 : 0
              }
            }
          : null
    };
  },
  async getLeaderboard() {
    const payload = await mockLeaderboardRepository.getLeaderboardPayload({
      groupId: "mock-group",
      fecha: "global",
      mode: "posiciones"
    });

    return payload.rows.map((row) => ({
      userId: row.userId ?? `row-${row.rank}-${row.name}`,
      displayName: row.name,
      points: row.points,
      rank: row.rank
    }));
  }
};

export const mockProfileRepository: ProfileRepository = {
  async updateProfile(input) {
    mockProfileUser = {
      ...mockProfileUser,
      ...(input.name !== undefined ? { name: input.name ?? mockProfileUser.name } : {}),
      ...(input.username !== undefined ? { username: input.username } : {}),
      ...(input.email !== undefined ? { email: input.email ?? mockProfileUser.email } : {}),
      ...(input.favoriteTeam !== undefined ? { favoriteTeam: input.favoriteTeam } : {})
    };
    return { ...mockProfileUser };
  },
  async getProfile() {
    return {
      stats: {
        totalPoints: 18,
        accuracyPct: 100,
        groups: 1
      },
      recentActivity: [
        {
          id: "pred:mock-1",
          type: "prediction",
          label: "Pronóstico: River Plate vs San Lorenzo",
          occurredAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
          points: 3
        },
        {
          id: "join:mock-1",
          type: "group_join",
          label: "Te uniste a Grupo Amigos",
          occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
        }
      ],
      updatedAt: new Date().toISOString()
    };
  }
};

let mockNotificationPreferences: NotificationPreferences = {
  reminders: true,
  results: true,
  social: true
};

let mockNotificationInbox: NotificationItem[] = [
  {
    id: "notif-mock-1",
    type: "weekly_winner",
    title: "Ganador semanal disponible",
    body: "Ya podés revisar quién ganó la última fecha.",
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    read: false
  }
];

const mockWeeklyWinner: WeeklyWinnerSummary = {
  period: "2",
  periodLabel: "Fecha 2",
  winnerName: "Usuario Fulbito",
  points: 12,
  tied: false
};

export const mockNotificationsRepository: NotificationsRepository = {
  async getPreferences() {
    return { ...mockNotificationPreferences };
  },
  async updatePreferences(input) {
    mockNotificationPreferences = {
      ...mockNotificationPreferences,
      ...input
    };
    return { ...mockNotificationPreferences };
  },
  async listInbox() {
    const items = [...mockNotificationInbox].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return {
      items,
      unreadCount: items.filter((item) => !item.read).length,
      weeklyWinner: mockWeeklyWinner
    };
  },
  async markAllRead() {
    mockNotificationInbox = mockNotificationInbox.map((item) => ({
      ...item,
      read: true
    }));
    return { ok: true } as const;
  },
  async dismissNotification(input) {
    mockNotificationInbox = mockNotificationInbox.filter((item) => item.id !== input.notificationId);
    return { ok: true } as const;
  },
  async registerDeviceToken() {
    return { ok: true } as const;
  }
};

let mockProfileUser: User = {
  id: "u-mock",
  email: "mock@example.com",
  name: "Usuario Fulbito",
  username: "usuariofulbito",
  favoriteTeam: "River Plate"
};

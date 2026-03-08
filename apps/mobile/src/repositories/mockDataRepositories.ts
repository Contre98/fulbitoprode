import type {
  FixtureRepository,
  GroupInvitePayload,
  GroupInviteRefreshPayload,
  GroupLeavePayload,
  GroupMemberRecord,
  GroupMemberUpdatePayload,
  GroupMembersPayload,
  GroupsRepository,
  LeaderboardApiPayload,
  LeaderboardRepository,
  NotificationsRepository,
  ProfileRepository,
  PredictionsRepository
} from "@fulbito/api-contracts";
import type { NotificationItem, NotificationPreferences, User, WeeklyWinnerSummary } from "@fulbito/domain";
import { createMockGroup, joinMockGroup, listMockGroups, listMockMemberships, renameMockGroup } from "@/repositories/mockGroupStore";

export const mockGroupsRepository: GroupsRepository = {
  async listGroups() {
    return listMockGroups();
  },
  async listMemberships() {
    return listMockMemberships();
  },
  async createGroup(input) {
    return createMockGroup(input);
  },
  async joinGroup(input) {
    return joinMockGroup(input);
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
      inviteUrl: `https://fulbito.local/configuracion?invite=${encodeURIComponent(invite.token)}`
    } satisfies GroupInvitePayload;
  },
  async refreshInvite(input) {
    const invite = createMockInvite(input.groupId, Date.now() + 1);
    mockInvitesByGroupId.set(input.groupId, invite);
    return {
      ok: true,
      invite
    } satisfies GroupInviteRefreshPayload;
  }
};

const mockMembersByGroupId = new Map<string, GroupMemberRecord[]>();
const mockInvitesByGroupId = new Map<string, { code: string; token: string; expiresAt: string }>();

function ensureMockGroupMembers(groupId: string) {
  const existing = mockMembersByGroupId.get(groupId);
  if (existing) {
    return existing;
  }
  const seeded: GroupMemberRecord[] = [
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

const predictionsByKey = new Map<string, { fixtureId: string; home: number; away: number }[]>();

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

export const mockLeaderboardRepository: LeaderboardRepository = {
  async getLeaderboardPayload(input) {
    const mode = input.mode === "stats" ? "stats" : "posiciones";
    const rows: LeaderboardApiPayload["rows"] = [
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

    return {
      groupLabel: "Grupo Amigos",
      mode,
      period: input.fecha || "global",
      periodLabel: input.fecha || "Global acumulado",
      updatedAt: new Date().toISOString(),
      rows,
      groupStats:
        mode === "stats"
          ? {
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
                userId: "user-1",
                userName: "Usuario Fulbito",
                points: 9
              },
              worstFecha: {
                period: "Fecha 2",
                periodLabel: "Fecha 2",
                userId: "user-1",
                userName: "Usuario Fulbito",
                points: 9
              },
              worldBenchmark: null
            }
          : null,
      stats:
        mode === "stats"
          ? {
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
                  userId: "user-1",
                  userName: "Usuario Fulbito",
                  points: 9
                },
                worstRound: {
                  period: "Fecha 2",
                  periodLabel: "Fecha 2",
                  userId: "user-1",
                  userName: "Usuario Fulbito",
                  points: 9
                },
                worldBenchmark: null
              },
              awards: [
                {
                  id: "nostradamus",
                  title: "NOSTRADAMUS",
                  winnerUserId: "user-1",
                  winnerName: "Usuario Fulbito",
                  subtitle: "Mayor cantidad de plenos (6)",
                  metricValue: 6
                }
              ],
              historicalSeries: [
                {
                  userId: "user-1",
                  userName: "Usuario Fulbito",
                  points: [
                    { period: "Fecha 1", periodLabel: "Fecha 1", rank: 1, points: 9 },
                    { period: "Fecha 2", periodLabel: "Fecha 2", rank: 1, points: 9 }
                  ]
                }
              ]
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

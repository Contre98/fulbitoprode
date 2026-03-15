import type {
  Fixture,
  Group,
  GroupSearchResult,
  GroupVisibility,
  LeaderboardAward,
  LeaderboardEntry,
  LeaderboardHistoricalSeries,
  LeaderboardMemberStatsSummary,
  LeaderboardStatsComparatives,
  LeaderboardGroupStatsSection,
  LeaderboardMode,
  LeaderboardPeriod,
  LeaderboardUserStatsSection,
  LeaderboardStatsRow,
  MatchScoreValue,
  Membership,
  MembershipStatus,
  NotificationItem,
  NotificationPreferences,
  ProfilePayload,
  Prediction,
  WeeklyWinnerSummary,
  User
} from "@fulbito/domain";

export interface AuthSession {
  user: User;
  memberships: Membership[];
}

export interface AuthRepository {
  getSession(): Promise<AuthSession | null>;
  loginWithPassword(email: string, password: string): Promise<AuthSession>;
  loginWithGoogleIdToken(idToken: string): Promise<AuthSession>;
  registerWithPassword(input: { email: string; password: string; name: string }): Promise<AuthSession>;
  requestPasswordReset(email: string): Promise<{ ok: true; message: string }>;
  changePassword(input: { password: string; oldPassword?: string }): Promise<{ ok: true }>;
  deleteAccount(): Promise<{ ok: true }>;
  logout(): Promise<void>;
}

export interface JoinGroupResult {
  group: Group;
  status: "joined" | "pending";
}

export interface JoinRequestRecord {
  id: string;
  userId: string;
  userName: string;
  requestedAt: string;
}

export interface JoinRequestsPayload {
  requests: JoinRequestRecord[];
}

export interface GroupsRepository {
  listGroups(): Promise<Group[]>;
  listMemberships(): Promise<Membership[]>;
  searchGroups(input: { query?: string; leagueId?: number; page?: number; perPage?: number }): Promise<GroupSearchPage>;
  createGroup(input: {
    name: string;
    season?: string;
    leagueId?: number;
    competitionStage?: "apertura" | "clausura" | "general";
    competitionName?: string;
    competitionKey?: string;
    visibility?: GroupVisibility;
    startingFecha?: string;
  }): Promise<Group>;
  joinGroup(input: { codeOrToken: string }): Promise<JoinGroupResult>;
  updateGroupName(input: { groupId: string; name: string }): Promise<{ ok: true; group: { id: string; name: string } }>;
  listMembers(input: { groupId: string }): Promise<GroupMembersPayload>;
  updateMemberRole(input: { groupId: string; userId: string; role: "admin" | "member" }): Promise<GroupMemberUpdatePayload>;
  removeMember(input: { groupId: string; userId: string }): Promise<{ ok: true }>;
  leaveGroup(input: { groupId: string }): Promise<GroupLeavePayload>;
  deleteGroup(input: { groupId: string }): Promise<GroupDeletePayload>;
  getInvite(input: { groupId: string }): Promise<GroupInvitePayload>;
  refreshInvite(input: { groupId: string }): Promise<GroupInviteRefreshPayload>;
  listJoinRequests(input: { groupId: string }): Promise<JoinRequestsPayload>;
  respondToJoinRequest(input: { groupId: string; userId: string; action: "approve" | "reject" }): Promise<{ ok: true }>;
}

export interface GroupSearchPage {
  groups: GroupSearchResult[];
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  hasMore: boolean;
}

export interface GroupMemberRecord {
  userId: string;
  name: string;
  role: Membership["role"];
  joinedAt: string;
  logoDataUrl?: string | null;
  groupLogoDataUrl?: string | null;
  competitionLogoDataUrl?: string | null;
  teamLogoDataUrl?: string | null;
  avatarDataUrl?: string | null;
}

export interface GroupMembersPayload {
  members: GroupMemberRecord[];
  viewerRole: Membership["role"];
  canManage: boolean;
}

export interface GroupMemberUpdatePayload {
  ok: true;
  changed: boolean;
  member: GroupMemberRecord;
}

export interface GroupInviteRecord {
  code: string;
  token: string;
  expiresAt: string;
}

export interface GroupInvitePayload {
  invite: GroupInviteRecord | null;
  canRefresh: boolean;
  inviteUrl?: string;
}

export interface GroupInviteRefreshPayload {
  ok: true;
  invite: GroupInviteRecord;
}

export interface GroupLeavePayload {
  ok: true;
  deletedGroup: boolean;
}

export interface GroupDeletePayload {
  ok: true;
  warningRequired?: boolean;
}

export interface PredictionsRepository {
  listPredictions(input: { groupId: string; fecha: string }): Promise<Prediction[]>;
  savePrediction(input: { groupId: string; fecha: string; prediction: Prediction }): Promise<void>;
}

export interface FixtureRepository {
  listFixture(input: { groupId: string; fecha: string }): Promise<Fixture[]>;
}

export interface FixtureApiTeamRef {
  code: string;
  name?: string;
  logoUrl?: string;
}

export interface FixtureApiMatch {
  id: string;
  status: Fixture["status"];
  kickoffAt?: string;
  newKickoffAt?: string;
  homeTeam: FixtureApiTeamRef;
  awayTeam: FixtureApiTeamRef;
  score?: MatchScoreValue;
}

export interface FixtureApiCardRow {
  home: string;
  away: string;
  homeLogoUrl?: string;
  awayLogoUrl?: string;
  score?: MatchScoreValue;
  scoreLabel: string;
  tone: "final" | "live" | "upcoming" | "warning" | "postponed";
  kickoffAt?: string;
  venue?: string;
  statusDetail?: string;
}

export interface FixtureApiCard {
  dateLabel: string;
  accent?: "default" | "live";
  rows: FixtureApiCardRow[];
}

export interface FixtureApiPayload {
  period: string;
  periodLabel: string;
  cards: FixtureApiCard[];
  matches: FixtureApiMatch[];
  updatedAt: string;
}

export interface LeaderboardRepository {
  getLeaderboardPayload(input: { groupId: string; fecha: string; mode?: LeaderboardMode }): Promise<LeaderboardApiPayload>;
  getLeaderboard(input: { groupId: string; fecha: string }): Promise<LeaderboardEntry[]>;
}

export interface ProfileRepository {
  getProfile(): Promise<ProfilePayload>;
  updateProfile(input: {
    name?: string | null;
    username?: string | null;
    email?: string | null;
    favoriteTeam?: string | null;
  }): Promise<User>;
}

export interface NotificationsRepository {
  getPreferences(): Promise<NotificationPreferences>;
  updatePreferences(input: Partial<NotificationPreferences>): Promise<NotificationPreferences>;
  listInbox(): Promise<{ items: NotificationItem[]; unreadCount: number; weeklyWinner: WeeklyWinnerSummary | null }>;
  markAllRead(): Promise<{ ok: true }>;
  dismissNotification(input: { notificationId: string }): Promise<{ ok: true }>;
  registerDeviceToken(input: { token: string; platform: string }): Promise<{ ok: true }>;
}

export type LeaderboardApiRow = LeaderboardStatsRow;

export interface LeaderboardApiGroupStats extends Omit<LeaderboardMemberStatsSummary, "bestRound" | "worstRound"> {
  bestFecha?: LeaderboardMemberStatsSummary["bestRound"];
  worstFecha?: LeaderboardMemberStatsSummary["worstRound"];
}

export interface LeaderboardApiStatsPayload {
  summary: LeaderboardMemberStatsSummary;
  awards: LeaderboardAward[];
  historicalSeries: LeaderboardHistoricalSeries[];
  userSection?: LeaderboardUserStatsSection;
  groupSection?: LeaderboardGroupStatsSection;
  comparatives?: LeaderboardStatsComparatives;
}

export interface LeaderboardApiPayload {
  groupLabel: string;
  mode: LeaderboardMode;
  period: LeaderboardPeriod;
  periodLabel: string;
  updatedAt: string;
  rows: LeaderboardApiRow[];
  groupStats?: LeaderboardApiGroupStats | null;
  stats?: LeaderboardApiStatsPayload | null;
}

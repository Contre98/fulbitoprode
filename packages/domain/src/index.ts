export type MembershipRole = "owner" | "admin" | "member";
export type CompetitionStage = "apertura" | "clausura" | "general";

export interface User {
  id: string;
  email: string;
  name: string;
  username?: string | null;
  favoriteTeam?: string | null;
}

export interface Membership {
  groupId: string;
  groupName: string;
  leagueId: number;
  leagueName: string;
  season: string;
  competitionKey?: string;
  competitionName?: string;
  competitionStage?: CompetitionStage;
  role: MembershipRole;
  joinedAt: string;
}

export interface SessionPayload {
  user: User;
  memberships: Membership[];
}

export interface Group {
  id: string;
  name: string;
  leagueId: number;
  season: string;
}

export interface Prediction {
  fixtureId: string;
  home: number;
  away: number;
}

export interface Fixture {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  status: "upcoming" | "live" | "final";
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  points: number;
  rank: number;
}

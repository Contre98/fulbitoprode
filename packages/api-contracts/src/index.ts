import type { Fixture, Group, LeaderboardEntry, Membership, Prediction, User } from "@fulbito/domain";

export interface AuthSession {
  user: User;
  memberships: Membership[];
}

export interface AuthRepository {
  getSession(): Promise<AuthSession | null>;
  loginWithPassword(email: string, password: string): Promise<AuthSession>;
  registerWithPassword(input: { email: string; password: string; name: string }): Promise<AuthSession>;
  logout(): Promise<void>;
}

export interface GroupsRepository {
  listGroups(): Promise<Group[]>;
  listMemberships(): Promise<Membership[]>;
  createGroup(input: {
    name: string;
    season?: string;
    leagueId?: number;
    competitionStage?: "apertura" | "clausura" | "general";
    competitionName?: string;
    competitionKey?: string;
  }): Promise<Group>;
  joinGroup(input: { codeOrToken: string }): Promise<Group>;
}

export interface PredictionsRepository {
  listPredictions(input: { groupId: string; fecha: string }): Promise<Prediction[]>;
  savePrediction(input: { groupId: string; fecha: string; prediction: Prediction }): Promise<void>;
}

export interface FixtureRepository {
  listFixture(input: { groupId: string; fecha: string }): Promise<Fixture[]>;
}

export interface LeaderboardRepository {
  getLeaderboard(input: { groupId: string; fecha: string }): Promise<LeaderboardEntry[]>;
}

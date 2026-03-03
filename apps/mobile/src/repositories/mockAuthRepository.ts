import type { AuthRepository, AuthSession } from "@fulbito/api-contracts";

let inMemorySession: AuthSession | null = null;

const defaultMemberships: AuthSession["memberships"] = [
  {
    groupId: "grupo-1",
    groupName: "Grupo Amigos",
    leagueId: 128,
    leagueName: "Liga Profesional",
    season: "2026",
    role: "owner",
    joinedAt: new Date().toISOString(),
    competitionKey: "argentina-128",
    competitionName: "Liga Profesional",
    competitionStage: "apertura"
  }
];

function createSession(email: string, name: string): AuthSession {
  return {
    user: {
      id: "user-1",
      email,
      name,
      username: name.toLowerCase().replace(/\s+/g, ""),
      favoriteTeam: "River Plate"
    },
    memberships: defaultMemberships
  };
}

export const mockAuthRepository: AuthRepository = {
  async getSession() {
    return inMemorySession;
  },
  async loginWithPassword(email: string) {
    inMemorySession = createSession(email, "Usuario Fulbito");
    return inMemorySession;
  },
  async registerWithPassword(input: { email: string; password: string; name: string }) {
    inMemorySession = createSession(input.email, input.name);
    return inMemorySession;
  },
  async logout() {
    inMemorySession = null;
  }
};

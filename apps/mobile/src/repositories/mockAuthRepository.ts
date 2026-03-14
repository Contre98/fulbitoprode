import type { AuthRepository, AuthSession } from "@fulbito/api-contracts";
import { listMockMemberships } from "@/repositories/mockGroupStore";

let inMemorySession: AuthSession | null = null;

function createSession(email: string, name: string): AuthSession {
  return {
    user: {
      id: "user-1",
      email,
      name,
      username: name.toLowerCase().replace(/\s+/g, ""),
      favoriteTeam: "River Plate"
    },
    memberships: listMockMemberships()
  };
}

export const mockAuthRepository: AuthRepository = {
  async getSession() {
    if (inMemorySession) {
      inMemorySession = {
        ...inMemorySession,
        memberships: listMockMemberships()
      };
    }
    return inMemorySession;
  },
  async loginWithPassword(email: string) {
    inMemorySession = createSession(email, "Usuario Fulbito");
    return inMemorySession;
  },
  async loginWithGoogleIdToken() {
    const email = "google.user@fulbito.mock";
    inMemorySession = createSession(email, "Usuario Google");
    return inMemorySession;
  },
  async registerWithPassword(input: { email: string; password: string; name: string }) {
    inMemorySession = createSession(input.email, input.name);
    return inMemorySession;
  },
  async requestPasswordReset() {
    return {
      ok: true,
      message: "If an account exists for this email, we sent password reset instructions."
    } as const;
  },
  async logout() {
    inMemorySession = null;
  }
};

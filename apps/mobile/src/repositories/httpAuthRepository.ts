import type { AuthRepository, AuthSession } from "@fulbito/api-contracts";

function getApiBaseUrl() {
  const raw = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (!raw) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL is not configured.");
  }
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${path}`);
  }

  return (await response.json()) as T;
}

interface AuthResponseBody {
  user: AuthSession["user"];
  memberships?: AuthSession["memberships"];
}

export const httpAuthRepository: AuthRepository = {
  async getSession() {
    const payload = await requestJson<AuthResponseBody>("/api/auth/me", { method: "GET" });
    return {
      user: payload.user,
      memberships: payload.memberships ?? []
    };
  },
  async loginWithPassword(email: string, password: string) {
    const loginPayload = await requestJson<AuthResponseBody>("/api/auth/login-password", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    try {
      const session = await httpAuthRepository.getSession();
      if (session) {
        return session;
      }
    } catch {
      // fallback below
    }

    return {
      user: loginPayload.user,
      memberships: loginPayload.memberships ?? []
    };
  },
  async registerWithPassword(input: { email: string; password: string; name: string }) {
    const registerPayload = await requestJson<AuthResponseBody>("/api/auth/register-password", {
      method: "POST",
      body: JSON.stringify(input)
    });

    try {
      const session = await httpAuthRepository.getSession();
      if (session) {
        return session;
      }
    } catch {
      // fallback below
    }

    return {
      user: registerPayload.user,
      memberships: registerPayload.memberships ?? []
    };
  },
  async logout() {
    await requestJson<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
  }
};

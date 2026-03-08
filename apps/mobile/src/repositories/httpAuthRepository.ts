import type { AuthRepository, AuthSession } from "@fulbito/api-contracts";
import { translateBackendErrorMessage } from "@fulbito/domain";
import { getRequiredApiBaseUrl } from "@/lib/apiBaseUrl";

function getApiBaseUrl() {
  return getRequiredApiBaseUrl();
}

class ApiHttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function parseErrorMessage(response: Response, path: string) {
  try {
    const payload = (await response.json()) as unknown;
    if (isRecord(payload) && typeof payload.error === "string" && payload.error.trim().length > 0) {
      return translateBackendErrorMessage(payload.error.trim());
    }
  } catch {
    // Ignore malformed/empty error bodies and fall back to generic status message.
  }
  return translateBackendErrorMessage(`HTTP ${response.status} for ${path}`);
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
    throw new ApiHttpError(response.status, await parseErrorMessage(response, path));
  }

  return (await response.json()) as T;
}

async function requestJsonOrNullOnUnauthorized<T>(path: string, init?: RequestInit): Promise<T | null> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new ApiHttpError(response.status, await parseErrorMessage(response, path));
  }

  return (await response.json()) as T;
}

interface AuthResponseBody {
  user: AuthSession["user"];
  memberships?: AuthSession["memberships"];
}

export const httpAuthRepository: AuthRepository = {
  async getSession() {
    const payload = await requestJsonOrNullOnUnauthorized<AuthResponseBody>("/api/auth/me", { method: "GET" });
    if (!payload) {
      return null;
    }
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
  async requestPasswordReset(email: string) {
    const payload = await requestJson<{ ok?: boolean; message?: string }>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email })
    });
    return {
      ok: true,
      message: payload.message || "If an account exists for this email, we sent password reset instructions."
    };
  },
  async logout() {
    await requestJson<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
  }
};

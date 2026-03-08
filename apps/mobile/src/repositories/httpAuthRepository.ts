import type { AuthRepository, AuthSession } from "@fulbito/api-contracts";
import { translateBackendErrorMessage } from "@fulbito/domain";
import { getRequiredApiBaseUrl } from "@/lib/apiBaseUrl";
import { clearAuthTokens, getAccessToken, getRefreshToken, setAuthTokens } from "@/repositories/httpAuthTokens";

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

async function performFetch(path: string, init?: RequestInit) {
  const baseUrl = getApiBaseUrl();
  const accessToken = await getAccessToken();

  const headers = new Headers(init?.headers || {});
  if (!headers.has("content-type") && init?.body) {
    headers.set("content-type", "application/json");
  }
  if (accessToken) {
    headers.set("authorization", `Bearer ${accessToken}`);
  }

  return fetch(`${baseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers
  });
}

interface RefreshPayload {
  ok?: boolean;
  accessToken?: string;
  refreshToken?: string;
}

async function tryRefreshTokens() {
  const baseUrl = getApiBaseUrl();
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  const response = await fetch(`${baseUrl}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ refreshToken })
  });

  if (!response.ok) {
    await clearAuthTokens();
    return false;
  }

  const payload = (await response.json()) as RefreshPayload;
  if (typeof payload.accessToken === "string") {
    await setAuthTokens({
      accessToken: payload.accessToken,
      refreshToken: typeof payload.refreshToken === "string" ? payload.refreshToken : refreshToken
    });
    return true;
  }

  await clearAuthTokens();
  return false;
}

async function requestJson<T>(path: string, init?: RequestInit, allowRefresh = true): Promise<T> {
  const response = await performFetch(path, init);

  if (response.status === 401 && allowRefresh && path !== "/api/auth/refresh") {
    const refreshed = await tryRefreshTokens();
    if (refreshed) {
      return requestJson<T>(path, init, false);
    }
  }

  if (!response.ok) {
    throw new ApiHttpError(response.status, await parseErrorMessage(response, path));
  }

  return (await response.json()) as T;
}

async function requestJsonOrNullOnUnauthorized<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    return await requestJson<T>(path, init);
  } catch (error) {
    if (error instanceof ApiHttpError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

interface AuthResponseBody {
  user: AuthSession["user"];
  memberships?: AuthSession["memberships"];
  accessToken?: string;
  refreshToken?: string;
}

async function persistTokensFromAuthPayload(payload: AuthResponseBody) {
  if (typeof payload.accessToken === "string") {
    await setAuthTokens({
      accessToken: payload.accessToken,
      refreshToken: typeof payload.refreshToken === "string" ? payload.refreshToken : null
    });
  }
}

export const httpAuthRepository: AuthRepository = {
  async getSession() {
    const payload = await requestJsonOrNullOnUnauthorized<AuthResponseBody>("/api/auth/me", { method: "GET" });
    if (!payload) {
      return null;
    }

    await persistTokensFromAuthPayload(payload);

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

    await persistTokensFromAuthPayload(loginPayload);

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

    await persistTokensFromAuthPayload(registerPayload);

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
    try {
      await requestJson<{ ok: boolean }>("/api/auth/logout", { method: "POST" }, false);
    } finally {
      await clearAuthTokens();
    }
  }
};

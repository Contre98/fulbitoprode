import { clearAuthTokens, getRefreshToken, setAuthTokens } from "@/repositories/httpAuthTokens";

let refreshInFlight: Promise<boolean> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function shouldClearTokens(status: number) {
  return status === 401 || status === 403;
}

export async function tryRefreshHttpAuthTokens(baseUrl: string) {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/api/auth/refresh`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ refreshToken })
      });
    } catch {
      return false;
    }

    if (!response.ok) {
      if (shouldClearTokens(response.status)) {
        await clearAuthTokens();
      }
      return false;
    }

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      return false;
    }

    if (isRecord(payload) && typeof payload.accessToken === "string" && payload.accessToken.trim().length > 0) {
      await setAuthTokens({
        accessToken: payload.accessToken,
        refreshToken: typeof payload.refreshToken === "string" && payload.refreshToken.trim().length > 0 ? payload.refreshToken : refreshToken
      });
      return true;
    }

    return false;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

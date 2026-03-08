import { getOptionalApiBaseUrl } from "@/lib/apiBaseUrl";
import { clearAuthTokens, getAccessToken, getRefreshToken, setAuthTokens } from "@/repositories/httpAuthTokens";

export interface PeriodOption {
  id: string;
  label: string;
}

export interface PeriodOptionsPayload {
  options: PeriodOption[];
  defaultFecha?: string;
}

export const DEFAULT_PERIOD_OPTIONS: PeriodOption[] = [
  { id: "2026-01", label: "Fecha 1" },
  { id: "2026-02", label: "Fecha 2" },
  { id: "2026-03", label: "Fecha 3" }
];

async function tryRefresh(baseUrl: string) {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  const response = await fetch(`${baseUrl}/api/auth/refresh`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ refreshToken })
  });

  if (!response.ok) {
    await clearAuthTokens();
    return false;
  }

  const payload = (await response.json()) as unknown;
  if (
    typeof payload === "object" &&
    payload !== null &&
    typeof (payload as { accessToken?: unknown }).accessToken === "string"
  ) {
    await setAuthTokens({
      accessToken: (payload as { accessToken: string }).accessToken,
      refreshToken:
        typeof (payload as { refreshToken?: unknown }).refreshToken === "string"
          ? ((payload as { refreshToken: string }).refreshToken ?? refreshToken)
          : refreshToken
    });
    return true;
  }

  await clearAuthTokens();
  return false;
}

async function fetchFechas(input: { leagueId: number; season: string; competitionStage?: "apertura" | "clausura" | "general" }) {
  const baseUrl = getOptionalApiBaseUrl();
  if (!baseUrl) {
    return null;
  }

  const query = new URLSearchParams({
    leagueId: String(input.leagueId),
    season: input.season
  });
  if (input.competitionStage) {
    query.set("competitionStage", input.competitionStage);
  }

  const runRequest = async () => {
    const accessToken = await getAccessToken();
    const headers = new Headers();
    if (accessToken) {
      headers.set("authorization", `Bearer ${accessToken}`);
    }

    return fetch(`${baseUrl}/api/fechas?${query.toString()}`, {
      method: "GET",
      headers
    });
  };

  let response = await runRequest();
  if (response.status === 401) {
    const refreshed = await tryRefresh(baseUrl);
    if (refreshed) {
      response = await runRequest();
    }
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const payload = (await response.json()) as {
    fechas?: Array<{ id?: string; label?: string }>;
    defaultFecha?: string;
  };

  const options = (payload.fechas ?? []).filter((item): item is { id: string; label: string } => {
    return typeof item?.id === "string" && item.id.length > 0 && typeof item?.label === "string" && item.label.length > 0;
  });

  if (options.length === 0) {
    return null;
  }

  return {
    options,
    defaultFecha: payload.defaultFecha
  } satisfies PeriodOptionsPayload;
}

export const periodRepository = {
  async listPeriodOptions(input: {
    leagueId: number;
    season: string;
    competitionStage?: "apertura" | "clausura" | "general";
  }): Promise<PeriodOptionsPayload> {
    try {
      const payload = await fetchFechas(input);
      if (!payload) {
        return {
          options: [...DEFAULT_PERIOD_OPTIONS],
          defaultFecha: DEFAULT_PERIOD_OPTIONS[0].id
        };
      }
      return payload;
    } catch {
      return {
        options: [...DEFAULT_PERIOD_OPTIONS],
        defaultFecha: DEFAULT_PERIOD_OPTIONS[0].id
      };
    }
  }
};

import { getOptionalApiBaseUrl } from "@/lib/apiBaseUrl";

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

  const response = await fetch(`${baseUrl}/api/fechas?${query.toString()}`, {
    method: "GET",
    credentials: "include"
  });

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
  async listPeriodOptions(input: { leagueId: number; season: string; competitionStage?: "apertura" | "clausura" | "general" }): Promise<PeriodOptionsPayload> {
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

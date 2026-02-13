import type { FixtureDateCard, FixtureMatchRow, MatchCardData, MatchPeriod, MatchStatus } from "@/lib/types";

type JsonObject = Record<string, unknown>;

const LIVE_STATUS_SHORT = new Set(["1H", "HT", "2H", "ET", "P", "INT", "LIVE"]);
const FINAL_STATUS_SHORT = new Set(["FT", "AET", "PEN", "AWD", "WO"]);

const PERIOD_WINDOWS: Record<MatchPeriod, { fromDays: number; toDays: number }> = {
  fecha14: { fromDays: -2, toDays: 2 },
  fecha15: { fromDays: 3, toDays: 7 }
};

interface LiveProviderConfig {
  baseUrl: string;
  apiKey: string;
  apiKeyHeader: string;
  apiHost?: string;
  apiHostHeader: string;
  fixturesPath: string;
  leagueId: string;
  season: string;
  timezone: string;
  roundByPeriod: Partial<Record<MatchPeriod, string>>;
}

export interface LiveProviderHealth {
  configured: boolean;
  baseUrl?: string;
  fixturesPath?: string;
  leagueId?: string;
  season?: string;
  timezone?: string;
  keyHeader?: string;
  hostHeader?: string;
  hasHost: boolean;
  period: MatchPeriod;
  queryMode?: "round" | "window";
  query?: {
    round?: string;
    from?: string;
    to?: string;
  };
  ok: boolean;
  status: number | null;
  latencyMs: number | null;
  fixturesCount: number;
  error?: string;
}

export interface LiveFixture {
  id: string;
  kickoffAt: string;
  statusShort: string;
  statusLong: string;
  elapsed: number | null;
  venue: string;
  homeName: string;
  awayName: string;
  homeGoals: number | null;
  awayGoals: number | null;
}

function asObject(value: unknown): JsonObject | null {
  if (typeof value === "object" && value !== null) {
    return value as JsonObject;
  }
  return null;
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function toYmd(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function shiftDate(base: Date, days: number) {
  const shifted = new Date(base);
  shifted.setDate(shifted.getDate() + days);
  return shifted;
}

function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeAscii(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function parseLiveProviderConfig(): LiveProviderConfig | null {
  const baseUrl = process.env.API_FOOTBALL_BASE_URL?.trim() || process.env.FOOTBALL_API_BASE_URL?.trim() || "";
  const apiKey = process.env.API_FOOTBALL_KEY?.trim() || process.env.FOOTBALL_API_KEY?.trim() || "";
  const prefersApiSports = Boolean(process.env.API_FOOTBALL_KEY?.trim());

  if (!baseUrl || !apiKey) {
    return null;
  }

  return {
    baseUrl,
    apiKey,
    apiKeyHeader:
      process.env.API_FOOTBALL_KEY_HEADER?.trim() ||
      process.env.FOOTBALL_API_KEY_HEADER?.trim() ||
      (prefersApiSports ? "x-apisports-key" : "x-rapidapi-key"),
    apiHost: process.env.API_FOOTBALL_HOST?.trim() || process.env.FOOTBALL_API_HOST?.trim() || undefined,
    apiHostHeader:
      process.env.API_FOOTBALL_HOST_HEADER?.trim() || process.env.FOOTBALL_API_HOST_HEADER?.trim() || "x-rapidapi-host",
    fixturesPath: process.env.API_FOOTBALL_FIXTURES_PATH?.trim() || process.env.FOOTBALL_API_FIXTURES_PATH?.trim() || "/fixtures",
    leagueId: process.env.API_FOOTBALL_ARG_LEAGUE_ID?.trim() || process.env.FOOTBALL_API_ARG_LEAGUE_ID?.trim() || "128",
    season:
      process.env.API_FOOTBALL_DEFAULT_SEASON?.trim() ||
      process.env.API_FOOTBALL_ARG_SEASON?.trim() ||
      process.env.FOOTBALL_API_ARG_SEASON?.trim() ||
      String(new Date().getFullYear()),
    timezone:
      process.env.API_FOOTBALL_ARG_TIMEZONE?.trim() ||
      process.env.FOOTBALL_API_ARG_TIMEZONE?.trim() ||
      "America/Argentina/Buenos_Aires",
    roundByPeriod: {
      fecha14:
        process.env.API_FOOTBALL_FECHA14_ROUND?.trim() ||
        process.env.FOOTBALL_API_FECHA14_ROUND?.trim() ||
        undefined,
      fecha15:
        process.env.API_FOOTBALL_FECHA15_ROUND?.trim() ||
        process.env.FOOTBALL_API_FECHA15_ROUND?.trim() ||
        undefined
    }
  };
}

function parseFixture(raw: unknown): LiveFixture | null {
  const row = asObject(raw);
  if (!row) return null;

  const fixtureNode = asObject(row.fixture);
  const teamsNode = asObject(row.teams);
  const goalsNode = asObject(row.goals);

  const statusNode = asObject(fixtureNode?.status);
  const venueNode = asObject(fixtureNode?.venue);
  const homeNode = asObject(teamsNode?.home);
  const awayNode = asObject(teamsNode?.away);

  const idRaw = fixtureNode?.id ?? `${homeNode?.name ?? ""}-${awayNode?.name ?? ""}-${fixtureNode?.date ?? ""}`;
  const kickoffAt = readString(fixtureNode?.date, new Date().toISOString());

  return {
    id: String(idRaw),
    kickoffAt,
    statusShort: readString(statusNode?.short, "NS").toUpperCase(),
    statusLong: readString(statusNode?.long, "Not Started"),
    elapsed: readNumber(statusNode?.elapsed),
    venue: readString(venueNode?.name, ""),
    homeName: readString(homeNode?.name, "HOME"),
    awayName: readString(awayNode?.name, "AWAY"),
    homeGoals: readNumber(goalsNode?.home),
    awayGoals: readNumber(goalsNode?.away)
  };
}

function sortByKickoff(fixtures: LiveFixture[]) {
  return [...fixtures].sort((a, b) => {
    const aTime = new Date(a.kickoffAt).getTime();
    const bTime = new Date(b.kickoffAt).getTime();
    return aTime - bTime;
  });
}

export function classifyFixtureStatus(statusShort: string): MatchStatus {
  if (LIVE_STATUS_SHORT.has(statusShort)) {
    return "live";
  }
  if (FINAL_STATUS_SHORT.has(statusShort)) {
    return "final";
  }
  return "upcoming";
}

export function formatTeamCode(name: string): string {
  const cleaned = normalizeAscii(name)
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .trim();

  if (!cleaned) return "TEAM";

  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 3).toUpperCase();
  }

  const initials = parts
    .slice(0, 3)
    .map((part) => part.charAt(0))
    .join("");

  return initials.padEnd(3, parts[0].charAt(1) || "X").slice(0, 3).toUpperCase();
}

function formatKickoffLabel(kickoffAt: string, timezone: string) {
  const kickoffDate = new Date(kickoffAt);
  const now = new Date();
  const todayYmd = toYmd(now, timezone);
  const tomorrowYmd = toYmd(shiftDate(now, 1), timezone);
  const kickoffYmd = toYmd(kickoffDate, timezone);

  const timeLabel = new Intl.DateTimeFormat("es-AR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(kickoffDate);

  if (kickoffYmd === todayYmd) {
    return `POR JUGAR · HOY ${timeLabel}`;
  }

  if (kickoffYmd === tomorrowYmd) {
    return `POR JUGAR · MAN ${timeLabel}`;
  }

  const shortDate = new Intl.DateTimeFormat("es-AR", {
    timeZone: timezone,
    day: "2-digit",
    month: "2-digit"
  }).format(kickoffDate);

  return `POR JUGAR · ${shortDate} ${timeLabel}`;
}

function formatLiveLabel(fixture: LiveFixture) {
  const elapsed = fixture.elapsed ?? 0;
  const secondHalf = fixture.statusShort === "2H" || fixture.statusShort === "ET" || elapsed > 45;
  return `EN VIVO · ${elapsed}' ${secondHalf ? "ST" : "PT"}`;
}

function toProgress(elapsed: number | null) {
  if (elapsed === null) return 50;
  const progress = Math.round((elapsed / 90) * 100);
  return Math.max(8, Math.min(100, progress));
}

function dateLabelFromKickoff(kickoffAt: string, timezone: string) {
  const date = new Date(kickoffAt);
  const weekday = capitalize(
    new Intl.DateTimeFormat("es-AR", {
      weekday: "long",
      timeZone: timezone
    }).format(date)
  );
  const day = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    timeZone: timezone
  }).format(date);
  const month = capitalize(
    new Intl.DateTimeFormat("es-AR", {
      month: "long",
      timeZone: timezone
    }).format(date)
  );

  return `${weekday}, ${day} de ${month}`;
}

function formatFixtureUpcomingLabel(kickoffAt: string, timezone: string) {
  const timeLabel = new Intl.DateTimeFormat("es-AR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(kickoffAt));

  return `POR JUGAR · ${timeLabel}`;
}

function getHeaders(config: LiveProviderConfig) {
  const headers: Record<string, string> = {
    [config.apiKeyHeader]: config.apiKey
  };

  if (config.apiHost) {
    headers[config.apiHostHeader] = config.apiHost;
  }

  return headers;
}

function buildFixturesUrl(config: LiveProviderConfig, period: MatchPeriod) {
  const url = new URL(config.fixturesPath, config.baseUrl);
  url.searchParams.set("league", config.leagueId);
  url.searchParams.set("season", config.season);
  url.searchParams.set("timezone", config.timezone);

  const round = config.roundByPeriod[period];
  if (round) {
    url.searchParams.set("round", round);
    return {
      url,
      queryMode: "round" as const,
      query: { round }
    };
  }

  const now = new Date();
  const window = PERIOD_WINDOWS[period];
  const from = toYmd(shiftDate(now, window.fromDays), config.timezone);
  const to = toYmd(shiftDate(now, window.toDays), config.timezone);

  url.searchParams.set("from", from);
  url.searchParams.set("to", to);

  return {
    url,
    queryMode: "window" as const,
    query: { from, to }
  };
}

export async function probeLigaArgentinaProvider(period: MatchPeriod = "fecha14"): Promise<LiveProviderHealth> {
  const config = parseLiveProviderConfig();
  if (!config) {
    return {
      configured: false,
      hasHost: false,
      period,
      ok: false,
      status: null,
      latencyMs: null,
      fixturesCount: 0,
      error: "Provider env vars are missing."
    };
  }

  const { url, queryMode, query } = buildFixturesUrl(config, period);
  const startedAt = Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: getHeaders(config),
      cache: "no-store",
      signal: controller.signal
    });

    const payload = (await response.json()) as { response?: unknown[] };
    const rows = Array.isArray(payload.response) ? payload.response : [];

    return {
      configured: true,
      baseUrl: config.baseUrl,
      fixturesPath: config.fixturesPath,
      leagueId: config.leagueId,
      season: config.season,
      timezone: config.timezone,
      keyHeader: config.apiKeyHeader,
      hostHeader: config.apiHost ? config.apiHostHeader : undefined,
      hasHost: Boolean(config.apiHost),
      period,
      queryMode,
      query,
      ok: response.ok,
      status: response.status,
      latencyMs: Date.now() - startedAt,
      fixturesCount: rows.length,
      error: response.ok ? undefined : `Upstream returned status ${response.status}.`
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown provider error";
    return {
      configured: true,
      baseUrl: config.baseUrl,
      fixturesPath: config.fixturesPath,
      leagueId: config.leagueId,
      season: config.season,
      timezone: config.timezone,
      keyHeader: config.apiKeyHeader,
      hostHeader: config.apiHost ? config.apiHostHeader : undefined,
      hasHost: Boolean(config.apiHost),
      period,
      queryMode,
      query,
      ok: false,
      status: null,
      latencyMs: Date.now() - startedAt,
      fixturesCount: 0,
      error: message
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchLigaArgentinaFixtures(period: MatchPeriod): Promise<LiveFixture[]> {
  const config = parseLiveProviderConfig();
  if (!config) {
    return [];
  }

  try {
    const { url } = buildFixturesUrl(config, period);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: getHeaders(config),
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Upstream error ${response.status}`);
    }

    const payload = (await response.json()) as { response?: unknown[] };
    const rows = Array.isArray(payload.response) ? payload.response : [];

    return sortByKickoff(rows.map(parseFixture).filter((fixture): fixture is LiveFixture => fixture !== null));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown provider error";
    console.error(`[live-provider] Failed to fetch Liga Argentina fixtures: ${message}`);
    return [];
  }
}

export function mapFixturesToPronosticosMatches(fixtures: LiveFixture[]): MatchCardData[] {
  const config = parseLiveProviderConfig();
  const timezone = config?.timezone ?? "America/Argentina/Buenos_Aires";

  const mapped = fixtures.map((fixture) => {
    const status = classifyFixtureStatus(fixture.statusShort);
    const card: MatchCardData = {
      id: fixture.id,
      status,
      homeTeam: { code: formatTeamCode(fixture.homeName) },
      awayTeam: { code: formatTeamCode(fixture.awayName) },
      meta: {
        label:
          status === "live"
            ? formatLiveLabel(fixture)
            : status === "final"
              ? "FINALIZADO"
              : formatKickoffLabel(fixture.kickoffAt, timezone)
      }
    };

    if (status === "upcoming") {
      if (fixture.venue) {
        card.meta.venue = fixture.venue.toUpperCase();
      }
      return card;
    }

    card.score = {
      home: fixture.homeGoals ?? 0,
      away: fixture.awayGoals ?? 0
    };

    if (status === "live") {
      card.progress = toProgress(fixture.elapsed);
    }

    return card;
  });

  const statusOrder: Record<MatchStatus, number> = {
    live: 0,
    upcoming: 1,
    final: 2
  };

  return [...mapped]
    .sort((a, b) => statusOrder[a.status] - statusOrder[b.status])
    .slice(0, 12);
}

export function mapFixturesToFixtureCards(fixtures: LiveFixture[]): FixtureDateCard[] {
  const config = parseLiveProviderConfig();
  const timezone = config?.timezone ?? "America/Argentina/Buenos_Aires";

  const grouped = new Map<
    string,
    {
      dateLabel: string;
      rows: FixtureMatchRow[];
    }
  >();

  fixtures.forEach((fixture) => {
    const kickoff = new Date(fixture.kickoffAt);
    const key = toYmd(kickoff, timezone);

    if (!grouped.has(key)) {
      grouped.set(key, {
        dateLabel: dateLabelFromKickoff(fixture.kickoffAt, timezone),
        rows: []
      });
    }

    const status = classifyFixtureStatus(fixture.statusShort);
    const entry = grouped.get(key);
    if (!entry) return;

    const tone: FixtureMatchRow["tone"] =
      status === "live" ? "live" : status === "final" ? "final" : "upcoming";

    const scoreLabel =
      status === "live"
        ? `EN VIVO · ${fixture.homeGoals ?? 0} - ${fixture.awayGoals ?? 0}`
        : status === "final"
          ? `FINAL · ${fixture.homeGoals ?? 0} - ${fixture.awayGoals ?? 0}`
          : formatFixtureUpcomingLabel(fixture.kickoffAt, timezone);

    entry.rows.push({
      home: fixture.homeName,
      away: fixture.awayName,
      scoreLabel,
      tone
    });
  });

  return [...grouped.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, value]) => ({
      dateLabel: value.dateLabel,
      accent: value.rows.some((row) => row.tone === "live") ? "live" : "default",
      rows: value.rows
    }));
}

export function mapFixturesToHomeLiveMatches(fixtures: LiveFixture[]): MatchCardData[] {
  const mapped = mapFixturesToPronosticosMatches(fixtures);
  const liveOnly = mapped.filter((match) => match.status === "live");
  if (liveOnly.length >= 3) {
    return liveOnly.slice(0, 3);
  }

  return mapped.slice(0, 3);
}

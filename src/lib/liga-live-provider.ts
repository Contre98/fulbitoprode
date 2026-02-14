import type { FixtureDateCard, FixtureMatchRow, LeagueOption, MatchCardData, MatchPeriod, MatchStatus } from "@/lib/types";
import { getFootballProviderCoreConfig } from "@/lib/env";

type JsonObject = Record<string, unknown>;

const LIVE_STATUS_SHORT = new Set(["1H", "HT", "2H", "ET", "P", "INT", "LIVE"]);
const FINAL_STATUS_SHORT = new Set(["FT", "AET", "PEN", "AWD", "WO"]);
const DEFAULT_ALLOWED_LEAGUE_IDS = new Set([128, 39]); // Liga Profesional Argentina, Premier League

const LEGACY_PERIOD_WINDOWS: Record<string, { fromDays: number; toDays: number }> = {
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
  fixtureRoundsPath: string;
  leaguesPath: string;
  standingsPath: string;
  leagueId: string;
  season: string;
  timezone: string;
  roundByPeriod: Partial<Record<string, string>>;
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
  homeLogoUrl?: string;
  awayLogoUrl?: string;
  homeGoals: number | null;
  awayGoals: number | null;
}

export interface LiveStandingRow {
  rank: number;
  teamName: string;
  played: number;
  win: number;
  draw: number;
  lose: number;
  points: number;
  group: string;
}

export interface LiveStandingsPayload {
  leagueName: string;
  groupLabel: string;
  rows: LiveStandingRow[];
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

type CompetitionStage = "apertura" | "clausura" | "general";

type ProviderLeagueStatus = "ongoing" | "upcoming" | "expired";

const PROVIDER_CACHE_TTL_MS = {
  fixtures: 60_000,
  fechas: 60_000,
  leagues: 60_000,
  standings: 60_000
} as const;

const providerCache = new Map<string, { expiresAt: number; value: unknown }>();

async function withProviderCache<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const cached = providerCache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value as T;
  }

  const value = await loader();
  providerCache.set(key, {
    expiresAt: now + ttlMs,
    value
  });
  return value;
}

function normalizeSeason(value?: string) {
  const source = (value || "").trim();
  const match = source.match(/\d{4}/);
  if (match) {
    return match[0];
  }
  return source || String(new Date().getFullYear());
}

function parseDateValue(input: unknown) {
  const value = readString(input, "");
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function detectCompetitionStage(name: string): CompetitionStage {
  const normalized = normalizeAscii(name.toLowerCase());
  if (normalized.includes("apertura")) return "apertura";
  if (normalized.includes("clausura")) return "clausura";
  return "general";
}

function competitionLabel(stage: CompetitionStage) {
  if (stage === "apertura") return "Apertura";
  if (stage === "clausura") return "Clausura";
  return "General";
}

function parseLeagueStatus(rawSeasonNode: JsonObject | null): { status: ProviderLeagueStatus; startsAt?: string; endsAt?: string } {
  const now = Date.now();
  const startsAt = parseDateValue(rawSeasonNode?.start);
  const endsAt = parseDateValue(rawSeasonNode?.end);
  const isCurrent = rawSeasonNode?.current === true;

  if (isCurrent) {
    return {
      status: "ongoing",
      startsAt: startsAt?.toISOString(),
      endsAt: endsAt?.toISOString()
    };
  }

  if (startsAt && startsAt.getTime() > now) {
    return {
      status: "upcoming",
      startsAt: startsAt.toISOString(),
      endsAt: endsAt?.toISOString()
    };
  }

  if (endsAt && endsAt.getTime() >= now) {
    return {
      status: "ongoing",
      startsAt: startsAt?.toISOString(),
      endsAt: endsAt.toISOString()
    };
  }

  return {
    status: "expired",
    startsAt: startsAt?.toISOString(),
    endsAt: endsAt?.toISOString()
  };
}

function shouldKeepLeague(status: ProviderLeagueStatus, startsAt?: string) {
  if (status === "ongoing") return true;
  if (status !== "upcoming" || !startsAt) return false;
  const startsMs = new Date(startsAt).getTime();
  if (!Number.isFinite(startsMs)) return false;
  return startsMs - Date.now() <= 90 * 24 * 60 * 60 * 1000;
}

function parseLiveProviderConfig(): LiveProviderConfig | null {
  const core = getFootballProviderCoreConfig();
  if (!core) {
    return null;
  }

  return {
    baseUrl: core.baseUrl,
    apiKey: core.apiKey,
    apiKeyHeader:
      process.env.API_FOOTBALL_KEY_HEADER?.trim() ||
      process.env.FOOTBALL_API_KEY_HEADER?.trim() ||
      (core.prefersApiSports ? "x-apisports-key" : "x-rapidapi-key"),
    apiHost: process.env.API_FOOTBALL_HOST?.trim() || process.env.FOOTBALL_API_HOST?.trim() || undefined,
    apiHostHeader:
      process.env.API_FOOTBALL_HOST_HEADER?.trim() || process.env.FOOTBALL_API_HOST_HEADER?.trim() || "x-rapidapi-host",
    fixturesPath: process.env.API_FOOTBALL_FIXTURES_PATH?.trim() || process.env.FOOTBALL_API_FIXTURES_PATH?.trim() || "/fixtures",
    fixtureRoundsPath:
      process.env.API_FOOTBALL_FIXTURE_ROUNDS_PATH?.trim() ||
      process.env.FOOTBALL_API_FIXTURE_ROUNDS_PATH?.trim() ||
      "/fixtures/rounds",
    leaguesPath: process.env.API_FOOTBALL_LEAGUES_PATH?.trim() || process.env.FOOTBALL_API_LEAGUES_PATH?.trim() || "/leagues",
    standingsPath:
      process.env.API_FOOTBALL_STANDINGS_PATH?.trim() || process.env.FOOTBALL_API_STANDINGS_PATH?.trim() || "/standings",
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

function parseAllowedLeagueIds() {
  const raw = process.env.API_FOOTBALL_ALLOWED_LEAGUES?.trim() || "";
  if (!raw) {
    return DEFAULT_ALLOWED_LEAGUE_IDS;
  }

  const values = raw
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);

  return values.length > 0 ? new Set(values) : DEFAULT_ALLOWED_LEAGUE_IDS;
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
    homeLogoUrl: readString(homeNode?.logo, "") || undefined,
    awayLogoUrl: readString(awayNode?.logo, "") || undefined,
    homeGoals: readNumber(goalsNode?.home),
    awayGoals: readNumber(goalsNode?.away)
  };
}

function parseStandingRow(raw: unknown): LiveStandingRow | null {
  const node = asObject(raw);
  if (!node) return null;

  const teamNode = asObject(node.team);
  const allNode = asObject(node.all);

  const rank = readNumber(node.rank);
  const teamName = readString(teamNode?.name, "");

  if (rank === null || !teamName) {
    return null;
  }

  return {
    rank,
    teamName,
    played: readNumber(allNode?.played) ?? 0,
    win: readNumber(allNode?.win) ?? 0,
    draw: readNumber(allNode?.draw) ?? 0,
    lose: readNumber(allNode?.lose) ?? 0,
    points: readNumber(node.points) ?? 0,
    group: readString(node.group, "Tabla general")
  };
}

function parseStandingsPayload(raw: unknown): LiveStandingsPayload | null {
  const root = asObject(raw);
  const response = Array.isArray(root?.response) ? root.response : [];
  if (response.length === 0) return null;

  const first = asObject(response[0]);
  const league = asObject(first?.league);
  const leagueName = readString(league?.name, "Liga Argentina");
  const standingsRaw = Array.isArray(league?.standings) ? league.standings : [];

  if (standingsRaw.length === 0) {
    return null;
  }

  const firstGroup = standingsRaw.find((candidate) => Array.isArray(candidate));
  const rowsRaw = Array.isArray(firstGroup) ? firstGroup : [];
  const rows = rowsRaw.map(parseStandingRow).filter((row): row is LiveStandingRow => row !== null);

  if (rows.length === 0) {
    return null;
  }

  return {
    leagueName,
    groupLabel: rows[0].group || "Tabla general",
    rows: [...rows].sort((a, b) => a.rank - b.rank).slice(0, 20)
  };
}

function sortByKickoff(fixtures: LiveFixture[]) {
  return [...fixtures].sort((a, b) => {
    const aTime = new Date(a.kickoffAt).getTime();
    const bTime = new Date(b.kickoffAt).getTime();
    return aTime - bTime;
  });
}

function sortFechas(input: string[]) {
  const toScore = (value: string) => {
    const match = value.match(/(\d+)/);
    if (!match) {
      return Number.MAX_SAFE_INTEGER;
    }
    return Number(match[1]);
  };

  return [...input].sort((a, b) => {
    const aScore = toScore(a);
    const bScore = toScore(b);
    if (aScore !== bScore) {
      return aScore - bScore;
    }
    return a.localeCompare(b);
  });
}

function filterRoundsByCompetitionStage(rounds: string[], stage?: CompetitionStage) {
  if (!stage || stage === "general") {
    return rounds;
  }

  const opposite = stage === "apertura" ? "clausura" : "apertura";

  const withoutOpposite = rounds.filter((round) => {
    const normalized = normalizeAscii(round.toLowerCase());
    return !normalized.includes(opposite);
  });

  if (withoutOpposite.length > 0) {
    return withoutOpposite;
  }

  const withStage = rounds.filter((round) => {
    const normalized = normalizeAscii(round.toLowerCase());
    return normalized.includes(stage);
  });

  return withStage.length > 0 ? withStage : rounds;
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

function buildStandingsUrl(config: LiveProviderConfig, input?: { leagueId?: number | string; season?: string }) {
  const url = new URL(config.standingsPath, config.baseUrl);
  url.searchParams.set("league", String(input?.leagueId || config.leagueId));
  url.searchParams.set("season", input?.season || config.season);
  return url;
}

function toRoundParam(period: string, config: LiveProviderConfig) {
  if (!period) {
    return "";
  }

  const legacyRound = config.roundByPeriod[period];
  if (legacyRound) {
    return legacyRound;
  }

  return period;
}

function buildFixturesUrl(
  config: LiveProviderConfig,
  input: {
    period?: MatchPeriod;
    leagueId?: number | string;
    season?: string;
    timezone?: string;
  }
) {
  const url = new URL(config.fixturesPath, config.baseUrl);
  url.searchParams.set("league", String(input.leagueId || config.leagueId));
  url.searchParams.set("season", input.season || config.season);
  url.searchParams.set("timezone", input.timezone || config.timezone);

  const period = input.period?.trim();
  if (period) {
    const round = toRoundParam(period, config);
    url.searchParams.set("round", round);
    return {
      url,
      queryMode: "round" as const,
      query: { round }
    };
  }

  const now = new Date();
  const window = LEGACY_PERIOD_WINDOWS.fecha14;
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

function buildLeaguesUrl(config: LiveProviderConfig, season?: string) {
  const url = new URL(config.leaguesPath, config.baseUrl);
  if (season) {
    url.searchParams.set("season", season);
  }
  return url;
}

async function fetchLeagueRows(config: LiveProviderConfig, season?: string) {
  const url = buildLeaguesUrl(config, season);
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: getHeaders(config),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Upstream leagues error ${response.status}`);
  }

  const payload = (await response.json()) as { response?: unknown[] };
  return Array.isArray(payload.response) ? payload.response : [];
}

function buildFixtureRoundsUrl(config: LiveProviderConfig, input: { leagueId?: number | string; season?: string }) {
  const url = new URL(config.fixtureRoundsPath, config.baseUrl);
  url.searchParams.set("league", String(input.leagueId || config.leagueId));
  url.searchParams.set("season", input.season || config.season);
  return url;
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
  const compact = normalizeAscii(name)
    .replace(/[^A-Za-z0-9]+/g, "")
    .toUpperCase();

  if (!compact) return "TEA";
  if (compact.length >= 3) {
    return compact.slice(0, 3);
  }

  return compact.padEnd(3, "X");
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

export function formatRoundLabel(period: string) {
  const clean = period.trim();
  if (!clean) return clean;

  const normalized = normalizeAscii(clean.toLowerCase());
  const numericMatch = clean.match(/(\d+)/);
  const number = numericMatch?.[1];

  if (normalized.startsWith("fecha") && number) {
    return `Fecha ${number}`;
  }

  if (
    number &&
    (normalized.includes("regular season") ||
      normalized.includes("apertura") ||
      normalized.includes("clausura") ||
      normalized.includes("round"))
  ) {
    return `Fecha ${number}`;
  }

  return clean;
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

  const { url, queryMode, query } = buildFixturesUrl(config, { period });
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

export async function fetchProviderLeagues(input?: { season?: string }): Promise<LeagueOption[]> {
  const config = parseLiveProviderConfig();
  if (!config) {
    return [];
  }

  try {
    const requestedSeason = normalizeSeason(input?.season || config.season);
    const requestedYear = Number(requestedSeason);
    const seasonsToTry = [
      requestedSeason,
      Number.isFinite(requestedYear) ? String(requestedYear - 1) : null,
      Number.isFinite(requestedYear) ? String(requestedYear + 1) : null,
      undefined
    ].filter((value, index, list): value is string | undefined => list.indexOf(value) === index);

    const byLeague = new Map<string, LeagueOption>();
    const allowedIds = parseAllowedLeagueIds();

    for (const season of seasonsToTry) {
      const rows = await withProviderCache(
        `provider:leagues:${config.baseUrl}:${season || "all"}`,
        PROVIDER_CACHE_TTL_MS.leagues,
        async () => fetchLeagueRows(config, season)
      );

      rows.forEach((raw) => {
        const row = asObject(raw);
        const leagueNode = asObject(row?.league);
        const countryNode = asObject(row?.country);
        const seasonsNode = Array.isArray(row?.seasons) ? row?.seasons : [];

        const id = readNumber(leagueNode?.id);
        const name = readString(leagueNode?.name, "");
        if (id === null || !name) {
          return;
        }

        if (allowedIds && !allowedIds.has(id)) {
          return;
        }

        const normalizedSeason = String(season || config.season);
        const matchingSeasonNode =
          seasonsNode
            .map((node) => asObject(node))
            .find((node) => String(readNumber(node?.year) ?? "") === normalizedSeason) ||
          seasonsNode.map((node) => asObject(node)).find((node) => node?.current === true) ||
          null;

        const parsedStatus = parseLeagueStatus(matchingSeasonNode);
        const stage = detectCompetitionStage(name);
        const competitionName = stage === "general" ? name : `Liga Profesional ${competitionLabel(stage)}`;
        const competitionKey = `${id}-${normalizedSeason}-${stage}`;

        const option: LeagueOption = {
          id,
          name: competitionName,
          country: readString(countryNode?.name, "") || undefined,
          season: normalizedSeason,
          competitionKey,
          competitionName: competitionLabel(stage),
          competitionStage: stage,
          status: parsedStatus.status === "expired" ? "upcoming" : parsedStatus.status,
          startsAt: parsedStatus.startsAt,
          endsAt: parsedStatus.endsAt
        };

        if (stage === "general" && id === 128) {
          const stageOptions: LeagueOption[] = [
            {
              ...option,
              name: "Liga Profesional Apertura",
              competitionName: "Apertura",
              competitionStage: "apertura",
              competitionKey: `${id}-${normalizedSeason}-apertura`,
              status: "ongoing"
            },
            {
              ...option,
              name: "Liga Profesional Clausura",
              competitionName: "Clausura",
              competitionStage: "clausura",
              competitionKey: `${id}-${normalizedSeason}-clausura`,
              status: "upcoming"
            }
          ];

          stageOptions.forEach((entry) => {
            if (shouldKeepLeague(entry.status, entry.startsAt) && !byLeague.has(entry.competitionKey)) {
              byLeague.set(entry.competitionKey, entry);
            }
          });
          return;
        }

        if (!shouldKeepLeague(parsedStatus.status, parsedStatus.startsAt)) {
          return;
        }

        if (!byLeague.has(competitionKey)) {
          byLeague.set(competitionKey, option);
        }
      });

      if (byLeague.size > 0) {
        break;
      }
    }

    return [...byLeague.values()].sort((a, b) => {
      const statusDiff = a.status.localeCompare(b.status);
      if (statusDiff !== 0) {
        return statusDiff;
      }
      const countryDiff = (a.country || "").localeCompare(b.country || "");
      if (countryDiff !== 0) {
        return countryDiff;
      }
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown provider error";
    console.error(`[live-provider] Failed to fetch leagues: ${message}`);
    return [];
  }
}

export async function fetchAvailableFechas(input: {
  leagueId?: number | string;
  season?: string;
  competitionStage?: CompetitionStage;
}): Promise<MatchPeriod[]> {
  const config = parseLiveProviderConfig();
  if (!config) {
    return [];
  }

  try {
    const season = normalizeSeason(input.season || config.season);
    return await withProviderCache(
      `provider:rounds:${config.baseUrl}:${input.leagueId || config.leagueId}:${season}:${input.competitionStage || "general"}`,
      PROVIDER_CACHE_TTL_MS.fechas,
      async () => {
        const url = buildFixtureRoundsUrl(config, {
          leagueId: input.leagueId,
          season
        });

        const response = await fetch(url.toString(), {
          method: "GET",
          headers: getHeaders(config),
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error(`Upstream fixture rounds error ${response.status}`);
        }

        const payload = (await response.json()) as { response?: unknown[] };
        const rounds = Array.isArray(payload.response)
          ? payload.response
              .map((value) => readString(value, "").trim())
              .filter(Boolean)
          : [];

        return sortFechas(filterRoundsByCompetitionStage(rounds, input.competitionStage));
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown provider error";
    console.error(`[live-provider] Failed to fetch available fechas: ${message}`);
    return [];
  }
}

export async function resolveDefaultFecha(input: {
  leagueId?: number | string;
  season?: string;
  competitionStage?: CompetitionStage;
  fechas?: MatchPeriod[];
}): Promise<MatchPeriod> {
  const fechas = input.fechas && input.fechas.length > 0 ? input.fechas : await fetchAvailableFechas(input);
  if (fechas.length === 0) {
    return "";
  }

  const inspection = await Promise.all(
    fechas.map(async (fecha) => {
      const fixtures = await fetchLigaArgentinaFixtures({
        period: fecha,
        leagueId: input.leagueId,
        season: input.season,
        competitionStage: input.competitionStage
      });

      let hasLive = false;
      let hasUpcoming = false;

      fixtures.forEach((fixture) => {
        const status = classifyFixtureStatus(fixture.statusShort);
        if (status === "live") {
          hasLive = true;
        }
        if (status === "upcoming") {
          hasUpcoming = true;
        }
      });

      return {
        fecha,
        hasLive,
        hasUpcoming
      };
    })
  );

  const ongoingFecha = inspection.find((item) => item.hasLive)?.fecha;
  if (ongoingFecha) {
    return ongoingFecha;
  }

  const upcomingFecha = inspection.find((item) => item.hasUpcoming)?.fecha;
  if (upcomingFecha) {
    return upcomingFecha;
  }

  return fechas[0] || "";
}

export async function fetchLigaArgentinaFixtures(
  periodOrInput:
    | MatchPeriod
    | {
        period?: MatchPeriod;
        leagueId?: number | string;
        season?: string;
        competitionStage?: CompetitionStage;
      }
): Promise<LiveFixture[]> {
  const config = parseLiveProviderConfig();
  if (!config) {
    return [];
  }

  const input =
    typeof periodOrInput === "string"
      ? { period: periodOrInput }
      : {
          period: periodOrInput.period,
          leagueId: periodOrInput.leagueId,
          season: normalizeSeason(periodOrInput.season),
          competitionStage: periodOrInput.competitionStage
        };

  try {
    const season = normalizeSeason(input.season || config.season);
    const stage = input.competitionStage || "general";
    return await withProviderCache(
      `provider:fixtures:${config.baseUrl}:${input.leagueId || config.leagueId}:${season}:${stage}:${input.period || "auto"}`,
      PROVIDER_CACHE_TTL_MS.fixtures,
      async () => {
        const fetchByPeriod = async (period: string) => {
          const { url } = buildFixturesUrl(config, {
            ...input,
            season,
            period
          });

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
        };

        const requestedPeriod = input.period?.trim() || "";
        if (!requestedPeriod) {
          return fetchByPeriod("");
        }

        const primaryRows = await fetchByPeriod(requestedPeriod);
        if (primaryRows.length > 0) {
          return primaryRows;
        }

        const requestedNumber = requestedPeriod.match(/(\d+)/)?.[1];
        if (!requestedNumber) {
          return primaryRows;
        }

        const candidateFechas = await fetchAvailableFechas({
          leagueId: input.leagueId,
          season,
          competitionStage: input.competitionStage
        });

        for (const candidate of candidateFechas) {
          if (candidate === requestedPeriod) continue;
          const candidateNumber = candidate.match(/(\d+)/)?.[1];
          if (candidateNumber !== requestedNumber) continue;
          const candidateRows = await fetchByPeriod(candidate);
          if (candidateRows.length > 0) {
            return candidateRows;
          }
        }

        return primaryRows;
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown provider error";
    console.error(`[live-provider] Failed to fetch fixtures: ${message}`);
    return [];
  }
}

export async function fetchLigaArgentinaStandings(input?: { leagueId?: number | string; season?: string }): Promise<LiveStandingsPayload | null> {
  const config = parseLiveProviderConfig();
  if (!config) {
    return null;
  }

  try {
    const season = normalizeSeason(input?.season || config.season);
    return await withProviderCache(
      `provider:standings:${config.baseUrl}:${input?.leagueId || config.leagueId}:${season}`,
      PROVIDER_CACHE_TTL_MS.standings,
      async () => {
        const url = buildStandingsUrl(config, {
          leagueId: input?.leagueId,
          season
        });
        const response = await fetch(url.toString(), {
          method: "GET",
          headers: getHeaders(config),
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error(`Upstream standings error ${response.status}`);
        }

        const payload = await response.json();
        return parseStandingsPayload(payload);
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown provider error";
    console.error(`[live-provider] Failed to fetch standings: ${message}`);
    return null;
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
      homeTeam: { code: formatTeamCode(fixture.homeName), logoUrl: fixture.homeLogoUrl },
      awayTeam: { code: formatTeamCode(fixture.awayName), logoUrl: fixture.awayLogoUrl },
      meta: {
        label:
          status === "live"
            ? formatLiveLabel(fixture)
            : status === "final"
              ? "FINALIZADO"
              : formatKickoffLabel(fixture.kickoffAt, timezone)
      }
    };

    if (status !== "upcoming") {
      card.score = {
        home: fixture.homeGoals ?? 0,
        away: fixture.awayGoals ?? 0
      };
    }

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

  return [...mapped].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]).slice(0, 24);
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
      homeLogoUrl: fixture.homeLogoUrl,
      awayLogoUrl: fixture.awayLogoUrl,
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
  return mapFixturesToPronosticosMatches(fixtures).filter((match) => match.status === "live").slice(0, 6);
}

export function mapFixturesToHomeUpcomingMatches(fixtures: LiveFixture[]): FixtureDateCard[] {
  const limitedFixtures = sortByKickoff(fixtures)
    .filter((fixture) => classifyFixtureStatus(fixture.statusShort) !== "final")
    .slice(0, 3);

  return mapFixturesToFixtureCards(limitedFixtures);
}

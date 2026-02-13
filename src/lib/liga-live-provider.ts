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
  const baseUrl = process.env.FOOTBALL_API_BASE_URL?.trim() ?? "";
  const apiKey = process.env.FOOTBALL_API_KEY?.trim() ?? "";

  if (!baseUrl || !apiKey) {
    return null;
  }

  return {
    baseUrl,
    apiKey,
    apiKeyHeader: process.env.FOOTBALL_API_KEY_HEADER?.trim() || "x-rapidapi-key",
    apiHost: process.env.FOOTBALL_API_HOST?.trim() || undefined,
    apiHostHeader: process.env.FOOTBALL_API_HOST_HEADER?.trim() || "x-rapidapi-host",
    fixturesPath: process.env.FOOTBALL_API_FIXTURES_PATH?.trim() || "/fixtures",
    leagueId: process.env.FOOTBALL_API_ARG_LEAGUE_ID?.trim() || "128",
    season: process.env.FOOTBALL_API_ARG_SEASON?.trim() || String(new Date().getFullYear()),
    timezone: process.env.FOOTBALL_API_ARG_TIMEZONE?.trim() || "America/Argentina/Buenos_Aires",
    roundByPeriod: {
      fecha14: process.env.FOOTBALL_API_FECHA14_ROUND?.trim() || undefined,
      fecha15: process.env.FOOTBALL_API_FECHA15_ROUND?.trim() || undefined
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

export async function fetchLigaArgentinaFixtures(period: MatchPeriod): Promise<LiveFixture[]> {
  const config = parseLiveProviderConfig();
  if (!config) {
    return [];
  }

  try {
    const url = new URL(config.fixturesPath, config.baseUrl);
    url.searchParams.set("league", config.leagueId);
    url.searchParams.set("season", config.season);
    url.searchParams.set("timezone", config.timezone);

    const round = config.roundByPeriod[period];
    if (round) {
      url.searchParams.set("round", round);
    } else {
      const now = new Date();
      const window = PERIOD_WINDOWS[period];
      url.searchParams.set("from", toYmd(shiftDate(now, window.fromDays), config.timezone));
      url.searchParams.set("to", toYmd(shiftDate(now, window.toDays), config.timezone));
    }

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

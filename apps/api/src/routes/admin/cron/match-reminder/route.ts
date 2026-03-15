import { jsonResponse } from "#http";
import { requireAdminToken } from "../../auth";
import { dispatch } from "@fulbito/server-core/notification-dispatcher";
import { getPocketBaseConfig } from "@fulbito/server-core/pocketbase";
import { resolveDefaultFecha, fetchLigaArgentinaFixtures } from "@fulbito/server-core/liga-live-provider";
import type { LiveFixture } from "@fulbito/server-core/liga-live-provider";

type CompetitionStage = "apertura" | "clausura" | "general";

interface PbPage<T> {
  items: T[];
  totalPages: number;
}

async function pbAdminGet<T>(path: string): Promise<T> {
  const { url } = getPocketBaseConfig();
  const res = await fetch(`${url}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`PB ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

function decodeGroupSeason(raw: string, leagueId: number): { season: string; competitionStage: CompetitionStage } {
  const [seasonRaw, stageRaw] = raw.split("|");
  const stage: CompetitionStage =
    stageRaw === "apertura" || stageRaw === "clausura" ? stageRaw : leagueId === 128 ? "apertura" : "general";
  return { season: seasonRaw || String(new Date().getFullYear()), competitionStage: stage };
}

/**
 * POST /api/admin/cron/match-reminder
 *
 * Runs every 30 minutes via GitHub Actions.
 * Finds fixtures with kickoff in the next 25–75 minutes and notifies
 * users who already submitted a prediction for that fixture.
 * Idempotency key per fixture ensures each user is notified at most once.
 */
export async function POST(request: Request): Promise<Response> {
  const authError = requireAdminToken(request);
  if (authError) return authError;

  const now = Date.now();
  // 25–75 min window handles 30-min cron timing drift without double-firing
  const windowStartMs = now + 25 * 60 * 1000;
  const windowEndMs = now + 75 * 60 * 1000;

  // Fetch all active groups
  const groupsResult = await pbAdminGet<PbPage<{ id: string; league_id: number; season: string }>>(
    `/api/collections/groups/records?filter=${encodeURIComponent("is_active=true")}&perPage=200&fields=id,league_id,season`
  );

  // Resolve fixtures per unique league+season+stage (cached to avoid redundant API calls)
  const fixtureCache = new Map<string, LiveFixture[]>();
  const upcomingFixtures = new Map<string, LiveFixture>();

  for (const group of groupsResult.items) {
    const { season, competitionStage } = decodeGroupSeason(group.season, group.league_id);
    const cacheKey = `${group.league_id}:${season}:${competitionStage}`;

    let fixtures = fixtureCache.get(cacheKey);
    if (!fixtures) {
      const period = await resolveDefaultFecha({ leagueId: group.league_id, season, competitionStage });
      if (!period) {
        fixtureCache.set(cacheKey, []);
        continue;
      }
      fixtures = await fetchLigaArgentinaFixtures({ period, leagueId: group.league_id, season, competitionStage });
      fixtureCache.set(cacheKey, fixtures);
    }

    for (const fixture of fixtures) {
      const kickoffMs = new Date(fixture.kickoffAt).getTime();
      if (kickoffMs >= windowStartMs && kickoffMs <= windowEndMs) {
        upcomingFixtures.set(fixture.id, fixture);
      }
    }
  }

  if (upcomingFixtures.size === 0) {
    return jsonResponse({ sent: 0, fixtures: 0, message: "No fixtures starting in the next hour." }, { status: 200 });
  }

  let totalSent = 0;

  for (const [fixtureId, fixture] of upcomingFixtures) {
    // Only notify users who predicted this specific fixture
    const predsResult = await pbAdminGet<PbPage<{ user_id: string }>>(
      `/api/collections/predictions/records?filter=${encodeURIComponent(`fixture_id='${fixtureId}'`)}&perPage=2000&fields=user_id`
    );

    const recipientUserIds = [...new Set(predsResult.items.map((p) => p.user_id))];
    if (recipientUserIds.length === 0) continue;

    const minutesUntilKickoff = Math.round((new Date(fixture.kickoffAt).getTime() - now) / 60_000);

    const result = await dispatch({
      eventType: "prediction_lock",
      title: `${fixture.homeName} vs ${fixture.awayName}`,
      body: `El partido empieza en ~${minutesUntilKickoff} minutos. ¡Tus pronósticos ya están cargados!`,
      target: { scope: "user", targetIds: recipientUserIds },
      idempotencyKey: `cron:match-kickoff:${fixtureId}`,
      recipientUserIds
    });

    totalSent += (result as { sent?: number }).sent ?? 0;
  }

  return jsonResponse({ sent: totalSent, fixtures: upcomingFixtures.size }, { status: 200 });
}

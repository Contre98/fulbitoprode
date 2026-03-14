import { jsonResponse } from "#http";
import { requireAdminToken } from "../../auth";
import { dispatch } from "@fulbito/server-core/notification-dispatcher";
import { getPocketBaseConfig } from "@fulbito/server-core/pocketbase";
import {
  resolveDefaultFecha,
  fetchLigaArgentinaFixtures
} from "@fulbito/server-core/liga-live-provider";

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
 * POST /api/admin/cron/prediction-reminder
 *
 * Intended to be called by a GitHub Actions cron job.
 * Finds all users in active groups who haven't predicted yet for the current
 * fecha (when there are still upcoming fixtures), and sends them a
 * prediction_lock push notification.
 *
 * Optional query param: ?window=am|pm  (defaults to "default")
 * Using different window values allows two sends per day without idempotency
 * conflicts — the GitHub Actions schedule uses window=am at 12:00 UTC and
 * window=pm at 20:00 UTC.
 */
export async function POST(request: Request): Promise<Response> {
  const authError = requireAdminToken(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const window = searchParams.get("window") || "default";

  // 1. Fetch all active groups
  const groupsResult = await pbAdminGet<PbPage<{ id: string; league_id: number; season: string }>>(
    `/api/collections/groups/records?filter=${encodeURIComponent("is_active=true")}&perPage=200&fields=id,league_id,season`
  );

  const now = new Date();
  const dateKey = now.toISOString().slice(0, 10);

  const nonPredictorIds = new Set<string>();

  // Cache resolved periods per league+season+stage to avoid redundant API calls
  const periodCache = new Map<string, string>();

  for (const group of groupsResult.items) {
    const { season, competitionStage } = decodeGroupSeason(group.season, group.league_id);
    const cacheKey = `${group.league_id}:${season}:${competitionStage}`;

    let period = periodCache.get(cacheKey);
    if (period === undefined) {
      period = await resolveDefaultFecha({ leagueId: group.league_id, season, competitionStage });
      periodCache.set(cacheKey, period);
    }

    if (!period) continue;

    // Check if there are still upcoming fixtures in this period
    const fixtures = await fetchLigaArgentinaFixtures({ period, leagueId: group.league_id, season, competitionStage });
    const hasUpcoming = fixtures.some((f) => new Date(f.kickoffAt) > now);
    if (!hasUpcoming) continue;

    // Get active members of this group
    const membersResult = await pbAdminGet<PbPage<{ user_id: string }>>(
      `/api/collections/group_members/records?filter=${encodeURIComponent(`group_id='${group.id}' && status='active'`)}&perPage=500&fields=user_id`
    );

    // Get predictions already submitted for this group+period
    const predsResult = await pbAdminGet<PbPage<{ user_id: string }>>(
      `/api/collections/predictions/records?filter=${encodeURIComponent(`group_id='${group.id}' && period='${period}'`)}&perPage=2000&fields=user_id`
    );

    const predictorIds = new Set(predsResult.items.map((p) => p.user_id));

    for (const m of membersResult.items) {
      if (!predictorIds.has(m.user_id)) {
        nonPredictorIds.add(m.user_id);
      }
    }
  }

  if (nonPredictorIds.size === 0) {
    return jsonResponse(
      { sent: 0, skippedDuplicate: false, message: "No non-predictors found or no upcoming fixtures." },
      { status: 200 }
    );
  }

  const idempotencyKey = `cron:prediction-reminder:${dateKey}:${window}`;
  const recipientUserIds = [...nonPredictorIds];

  const result = await dispatch({
    eventType: "prediction_lock",
    title: "Cierre de pronósticos",
    body: "Queda poco para que cierre la fecha. ¡No te olvides de cargar tus pronósticos!",
    target: { scope: "user", targetIds: recipientUserIds },
    idempotencyKey,
    recipientUserIds
  });

  return jsonResponse(result, { status: 200 });
}

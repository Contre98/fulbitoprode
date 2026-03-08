import { jsonResponse } from "#http";
import { fetchProviderLeagues } from "@fulbito/server-core/liga-live-provider";
import { getSessionPocketBaseTokenFromRequest, getSessionUserIdFromRequest } from "@fulbito/server-core/request-auth";
import type { LeaguesPayload } from "@fulbito/server-core/types";

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  const pbToken = getSessionPocketBaseTokenFromRequest(request);
  if (!userId || !pbToken) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const season = searchParams.get("season")?.trim() || undefined;

  const leagues = await fetchProviderLeagues({ season });
  const payload: LeaguesPayload = {
    leagues,
    updatedAt: new Date().toISOString()
  };

  return jsonResponse(payload, { status: 200 });
}

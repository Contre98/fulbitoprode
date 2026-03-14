import { jsonResponse } from "#http";
import { searchGroups } from "@fulbito/server-core/m3-repo";
import { getSessionPocketBaseTokenFromRequest, getSessionUserIdFromRequest } from "@fulbito/server-core/request-auth";

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  const pbToken = getSessionPocketBaseTokenFromRequest(request);
  if (!userId || !pbToken) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? undefined;
  const leagueIdRaw = url.searchParams.get("leagueId");
  const pageRaw = url.searchParams.get("page");
  const perPageRaw = url.searchParams.get("perPage");
  const leagueId = leagueIdRaw ? Number.parseInt(leagueIdRaw, 10) : undefined;
  const page = pageRaw ? Number.parseInt(pageRaw, 10) : undefined;
  const perPage = perPageRaw ? Number.parseInt(perPageRaw, 10) : undefined;

  const result = await searchGroups(
    {
      query,
      leagueId: Number.isFinite(leagueId) ? leagueId : undefined,
      page: Number.isFinite(page) ? page : undefined,
      perPage: Number.isFinite(perPage) ? perPage : undefined
    },
    pbToken
  );
  return jsonResponse(result, { status: 200 });
}

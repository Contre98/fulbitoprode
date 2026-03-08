import { jsonResponse } from "#http";
import { joinGroupByCodeOrToken } from "@fulbito/server-core/m3-repo";
import { getSessionPocketBaseTokenFromRequest, getSessionUserIdFromRequest } from "@fulbito/server-core/request-auth";
export async function POST(request) {
    const userId = getSessionUserIdFromRequest(request);
    const pbToken = getSessionPocketBaseTokenFromRequest(request);
    if (!userId || !pbToken) {
        return jsonResponse({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        const body = (await request.json());
        const codeOrToken = body.codeOrToken?.trim() || "";
        if (!codeOrToken) {
            return jsonResponse({ error: "codeOrToken is required" }, { status: 400 });
        }
        const joined = await joinGroupByCodeOrToken({ userId, codeOrToken }, pbToken);
        if (!joined.ok) {
            return jsonResponse({ error: joined.error }, { status: 400 });
        }
        return jsonResponse({
            ok: true,
            group: {
                id: joined.group.id,
                name: joined.group.name,
                slug: joined.group.slug,
                season: joined.group.season,
                leagueId: joined.group.leagueId
            }
        }, { status: 200 });
    }
    catch {
        return jsonResponse({ error: "Invalid payload" }, { status: 400 });
    }
}

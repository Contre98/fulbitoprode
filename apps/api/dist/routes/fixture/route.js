import { jsonResponse } from "#http";
import { fetchAvailableFechas, fetchLigaArgentinaFixtures, formatRoundLabel, mapFixturesToFixtureCards, mapFixturesToPronosticosMatches, resolveDefaultFecha } from "@fulbito/server-core/liga-live-provider";
import { getSessionPocketBaseTokenFromRequest, getSessionUserIdFromRequest } from "@fulbito/server-core/request-auth";
import { listGroupsForUser } from "@fulbito/server-core/m3-repo";
export async function GET(request) {
    const userId = getSessionUserIdFromRequest(request);
    const pbToken = getSessionPocketBaseTokenFromRequest(request);
    if (!userId || !pbToken) {
        return jsonResponse({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const selectedGroupId = searchParams.get("groupId")?.trim() || null;
    const requestedPeriod = searchParams.get("period")?.trim() || null;
    const memberships = await listGroupsForUser(userId, pbToken);
    if (memberships.length === 0) {
        const payload = {
            period: "",
            periodLabel: "Sin fechas disponibles",
            cards: [],
            matches: [],
            updatedAt: new Date().toISOString()
        };
        return jsonResponse(payload, { status: 200 });
    }
    const selected = (selectedGroupId ? memberships.find((item) => item.group.id === selectedGroupId) : null) || memberships[0];
    if (!selected) {
        return jsonResponse({ error: "Forbidden" }, { status: 403 });
    }
    let period = requestedPeriod || "";
    if (!period) {
        const fechas = await fetchAvailableFechas({
            leagueId: selected.group.leagueId,
            season: selected.group.season,
            competitionStage: selected.group.competitionStage
        });
        period =
            (await resolveDefaultFecha({
                leagueId: selected.group.leagueId,
                season: selected.group.season,
                competitionStage: selected.group.competitionStage,
                fechas
            })) ||
                fechas[0] ||
                "";
    }
    if (!period) {
        const payload = {
            period: "",
            periodLabel: "Sin fechas disponibles",
            cards: [],
            matches: [],
            updatedAt: new Date().toISOString()
        };
        return jsonResponse(payload, { status: 200 });
    }
    const liveFixtures = await fetchLigaArgentinaFixtures({
        period,
        leagueId: selected.group.leagueId,
        season: selected.group.season,
        competitionStage: selected.group.competitionStage
    });
    const payload = {
        period,
        periodLabel: formatRoundLabel(period),
        cards: mapFixturesToFixtureCards(liveFixtures),
        matches: mapFixturesToPronosticosMatches(liveFixtures).map((match) => ({
            id: match.id,
            status: match.status,
            kickoffAt: match.kickoffAt,
            homeTeam: {
                code: match.homeTeam.code,
                name: match.homeTeam.name,
                logoUrl: match.homeTeam.logoUrl
            },
            awayTeam: {
                code: match.awayTeam.code,
                name: match.awayTeam.name,
                logoUrl: match.awayTeam.logoUrl
            },
            score: match.score
        })),
        updatedAt: new Date().toISOString()
    };
    return jsonResponse(payload, { status: 200 });
}

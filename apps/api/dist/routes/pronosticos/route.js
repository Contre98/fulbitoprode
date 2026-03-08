import { jsonResponse } from "#http";
import { calculatePredictionPoints } from "@fulbito/domain";
import { fetchAvailableFechas, fetchLigaArgentinaFixtures, formatRoundLabel, mapFixturesToPronosticosMatches, resolveDefaultFecha } from "@fulbito/server-core/liga-live-provider";
import { getSessionPocketBaseTokenFromRequest, getSessionUserIdFromRequest } from "@fulbito/server-core/request-auth";
import { enforceRateLimit, getRequesterFingerprint } from "@fulbito/server-core/rate-limit";
import { isActiveGroupMember, listGroupsForUser, listPredictionsForScope, upsertPrediction } from "@fulbito/server-core/m3-repo";
function withPredictions(matches, predictions) {
    return matches.map((match) => {
        const stored = predictions[match.id];
        const nextMatch = { ...match };
        if (stored && (stored.home !== null || stored.away !== null)) {
            nextMatch.prediction = {
                home: stored.home ?? 0,
                away: stored.away ?? 0
            };
        }
        if (nextMatch.score && nextMatch.prediction) {
            const points = calculatePredictionPoints(nextMatch.prediction, nextMatch.score);
            nextMatch.points = {
                value: points,
                tone: nextMatch.status === "final"
                    ? "neutral"
                    : points === 3
                        ? "positive"
                        : points === 1
                            ? "warning"
                            : "danger"
            };
        }
        return nextMatch;
    });
}
async function resolveSelection(request) {
    const { searchParams } = new URL(request.url);
    const selectedGroupId = searchParams.get("groupId")?.trim() || null;
    const requestedPeriod = searchParams.get("period")?.trim() || null;
    const userId = getSessionUserIdFromRequest(request);
    const pbToken = getSessionPocketBaseTokenFromRequest(request);
    if (!userId || !pbToken) {
        return { error: jsonResponse({ error: "Unauthorized" }, { status: 401 }) };
    }
    const memberships = await listGroupsForUser(userId, pbToken);
    if (memberships.length === 0) {
        return { error: jsonResponse({ error: "No active groups" }, { status: 409 }) };
    }
    const selected = (selectedGroupId ? memberships.find((item) => item.group.id === selectedGroupId) : null) || memberships[0];
    if (!selected) {
        return { error: jsonResponse({ error: "Forbidden" }, { status: 403 }) };
    }
    let period = requestedPeriod || "";
    if (!period) {
        const availableFechas = await fetchAvailableFechas({
            leagueId: selected.group.leagueId,
            season: selected.group.season,
            competitionStage: selected.group.competitionStage
        });
        period =
            (await resolveDefaultFecha({
                leagueId: selected.group.leagueId,
                season: selected.group.season,
                competitionStage: selected.group.competitionStage,
                fechas: availableFechas
            })) ||
                availableFechas[0] ||
                "";
    }
    return {
        userId,
        pbToken,
        selected,
        period
    };
}
export async function GET(request) {
    const selection = await resolveSelection(request);
    if ("error" in selection) {
        return selection.error;
    }
    const { userId, pbToken, selected, period } = selection;
    if (!period) {
        const emptyPayload = {
            period: "",
            periodLabel: "Sin fechas disponibles",
            matches: [],
            predictions: {},
            updatedAt: new Date().toISOString()
        };
        return jsonResponse(emptyPayload, { status: 200 });
    }
    const [fixtures, predictions] = await Promise.all([
        fetchLigaArgentinaFixtures({
            period,
            leagueId: selected.group.leagueId,
            season: selected.group.season,
            competitionStage: selected.group.competitionStage
        }),
        listPredictionsForScope({
            userId,
            groupId: selected.group.id,
            period
        }, pbToken)
    ]);
    const matches = mapFixturesToPronosticosMatches(fixtures);
    const payload = {
        period,
        periodLabel: formatRoundLabel(period),
        matches: withPredictions(matches, predictions),
        predictions,
        updatedAt: new Date().toISOString()
    };
    return jsonResponse(payload, { status: 200 });
}
export async function POST(request) {
    try {
        const body = (await request.json());
        const period = body.period?.trim() || "";
        const matchId = typeof body.matchId === "string" ? body.matchId : "";
        const groupId = typeof body.groupId === "string" ? body.groupId.trim() : "";
        const userId = getSessionUserIdFromRequest(request) ?? undefined;
        const pbToken = getSessionPocketBaseTokenFromRequest(request) ?? undefined;
        if (!userId || !pbToken) {
            return jsonResponse({ error: "Unauthorized" }, { status: 401 });
        }
        const requester = getRequesterFingerprint(request, `user:${userId}`);
        const rateLimit = enforceRateLimit(`predictions:write:${userId}:${requester}`, {
            limit: 120,
            windowMs: 10 * 60 * 1000
        });
        if (!rateLimit.allowed) {
            return jsonResponse({ error: "Too many prediction updates. Try again later." }, {
                status: 429,
                headers: {
                    "Retry-After": String(rateLimit.retryAfterSeconds)
                }
            });
        }
        if (!groupId || !period || !matchId) {
            return jsonResponse({ error: "groupId, period and matchId are required." }, { status: 400 });
        }
        if (!(await isActiveGroupMember(userId, groupId, pbToken))) {
            return jsonResponse({ error: "Forbidden" }, { status: 403 });
        }
        const memberships = await listGroupsForUser(userId, pbToken);
        const selected = memberships.find((item) => item.group.id === groupId);
        if (!selected) {
            return jsonResponse({ error: "Forbidden" }, { status: 403 });
        }
        const fixtures = await fetchLigaArgentinaFixtures({
            period,
            leagueId: selected.group.leagueId,
            season: selected.group.season,
            competitionStage: selected.group.competitionStage
        });
        const matches = mapFixturesToPronosticosMatches(fixtures);
        const match = matches.find((candidate) => candidate.id === matchId);
        if (!match || match.status !== "upcoming") {
            return jsonResponse({ error: "Invalid upcoming match id." }, { status: 400 });
        }
        if (match.isLocked) {
            return jsonResponse({ error: "Prediction window closed for this match." }, { status: 409 });
        }
        const home = typeof body.home === "number" ? Math.max(0, Math.min(20, body.home)) : null;
        const away = typeof body.away === "number" ? Math.max(0, Math.min(20, body.away)) : null;
        const nextValue = { home, away };
        await upsertPrediction({
            userId,
            groupId,
            fixtureId: matchId,
            period,
            home,
            away
        }, pbToken);
        return jsonResponse({ ok: true, prediction: nextValue, updatedAt: new Date().toISOString() }, { status: 200 });
    }
    catch {
        return jsonResponse({ error: "Invalid payload" }, { status: 400 });
    }
}

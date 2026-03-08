import { jsonResponse } from "#http";
import { fetchAvailableFechas, formatRoundLabel, resolveDefaultFecha } from "@fulbito/server-core/liga-live-provider";
import { getSessionPocketBaseTokenFromRequest, getSessionUserIdFromRequest } from "@fulbito/server-core/request-auth";
export async function GET(request) {
    const userId = getSessionUserIdFromRequest(request);
    const pbToken = getSessionPocketBaseTokenFromRequest(request);
    if (!userId || !pbToken) {
        return jsonResponse({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const leagueIdParam = searchParams.get("leagueId")?.trim() || "";
    const season = searchParams.get("season")?.trim() || String(new Date().getFullYear());
    const competitionStageRaw = searchParams.get("competitionStage")?.trim() || "";
    const competitionStage = competitionStageRaw === "apertura" || competitionStageRaw === "clausura" || competitionStageRaw === "general"
        ? competitionStageRaw
        : undefined;
    const leagueId = Number(leagueIdParam);
    if (!Number.isFinite(leagueId) || leagueId <= 0) {
        return jsonResponse({ error: "leagueId is required" }, { status: 400 });
    }
    const fechas = await fetchAvailableFechas({ leagueId, season, competitionStage });
    const defaultFecha = await resolveDefaultFecha({
        leagueId,
        season,
        competitionStage,
        fechas
    });
    const payload = {
        leagueId,
        season,
        fechas: fechas.map((fecha) => ({ id: fecha, label: formatRoundLabel(fecha) })),
        defaultFecha,
        updatedAt: new Date().toISOString()
    };
    return jsonResponse(payload, { status: 200 });
}

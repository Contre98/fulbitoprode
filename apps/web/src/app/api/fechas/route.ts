import { NextResponse } from "next/server";
import { fetchAvailableFechas, formatRoundLabel, resolveDefaultFecha } from "@/lib/liga-live-provider";
import { getSessionPocketBaseTokenFromRequest, getSessionUserIdFromRequest } from "@/lib/request-auth";
import type { FechasPayload } from "@/lib/types";

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  const pbToken = getSessionPocketBaseTokenFromRequest(request);
  if (!userId || !pbToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const leagueIdParam = searchParams.get("leagueId")?.trim() || "";
  const season = searchParams.get("season")?.trim() || String(new Date().getFullYear());
  const competitionStageRaw = searchParams.get("competitionStage")?.trim() || "";
  const competitionStage =
    competitionStageRaw === "apertura" || competitionStageRaw === "clausura" || competitionStageRaw === "general"
      ? competitionStageRaw
      : undefined;

  const leagueId = Number(leagueIdParam);
  if (!Number.isFinite(leagueId) || leagueId <= 0) {
    return NextResponse.json({ error: "leagueId is required" }, { status: 400 });
  }

  const fechas = await fetchAvailableFechas({ leagueId, season, competitionStage });
  const defaultFecha = await resolveDefaultFecha({
    leagueId,
    season,
    competitionStage,
    fechas
  });
  const payload: FechasPayload = {
    leagueId,
    season,
    fechas: fechas.map((fecha) => ({ id: fecha, label: formatRoundLabel(fecha) })),
    defaultFecha,
    updatedAt: new Date().toISOString()
  };

  return NextResponse.json(payload, { status: 200 });
}

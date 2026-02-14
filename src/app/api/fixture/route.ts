import { NextResponse } from "next/server";
import {
  fetchAvailableFechas,
  fetchLigaArgentinaFixtures,
  formatRoundLabel,
  mapFixturesToFixtureCards,
  resolveDefaultFecha
} from "@/lib/liga-live-provider";
import { getSessionPocketBaseTokenFromRequest, getSessionUserIdFromRequest } from "@/lib/request-auth";
import { listGroupsForUser } from "@/lib/m3-repo";
import type { FixturePayload } from "@/lib/types";

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  const pbToken = getSessionPocketBaseTokenFromRequest(request);
  if (!userId || !pbToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const selectedGroupId = searchParams.get("groupId")?.trim() || null;
  const requestedPeriod = searchParams.get("period")?.trim() || null;

  const memberships = await listGroupsForUser(userId, pbToken);
  if (memberships.length === 0) {
    const payload: FixturePayload = {
      period: "",
      periodLabel: "Sin fechas disponibles",
      cards: [],
      updatedAt: new Date().toISOString()
    };
    return NextResponse.json(payload, { status: 200 });
  }

  const selected =
    (selectedGroupId ? memberships.find((item) => item.group.id === selectedGroupId) : null) || memberships[0];
  if (!selected) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const fechas = await fetchAvailableFechas({
    leagueId: selected.group.leagueId,
    season: selected.group.season,
    competitionStage: selected.group.competitionStage
  });

  const period =
    requestedPeriod ||
    (await resolveDefaultFecha({
      leagueId: selected.group.leagueId,
      season: selected.group.season,
      competitionStage: selected.group.competitionStage,
      fechas
    })) ||
    fechas[0] ||
    "";
  if (!period) {
    const payload: FixturePayload = {
      period: "",
      periodLabel: "Sin fechas disponibles",
      cards: [],
      updatedAt: new Date().toISOString()
    };
    return NextResponse.json(payload, { status: 200 });
  }

  const liveFixtures = await fetchLigaArgentinaFixtures({
    period,
    leagueId: selected.group.leagueId,
    season: selected.group.season,
    competitionStage: selected.group.competitionStage
  });

  const payload: FixturePayload = {
    period,
    periodLabel: formatRoundLabel(period),
    cards: mapFixturesToFixtureCards(liveFixtures),
    updatedAt: new Date().toISOString()
  };

  return NextResponse.json(payload, { status: 200 });
}

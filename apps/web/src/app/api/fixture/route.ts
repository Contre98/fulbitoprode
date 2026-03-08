import { NextResponse } from "next/server";
import {
  fetchAvailableFechas,
  fetchLigaArgentinaFixtures,
  formatRoundLabel,
  mapFixturesToFixtureCards,
  mapFixturesToPronosticosMatches,
  resolveDefaultFecha
} from "@/lib/liga-live-provider";
import { getSessionPocketBaseTokenFromRequest, getSessionUserIdFromRequest } from "@/lib/request-auth";
import { listGroupsForUser } from "@/lib/m3-repo";
import type { FixtureApiPayload } from "@fulbito/api-contracts";

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
    const payload: FixtureApiPayload = {
      period: "",
      periodLabel: "Sin fechas disponibles",
      cards: [],
      matches: [],
      updatedAt: new Date().toISOString()
    };
    return NextResponse.json(payload, { status: 200 });
  }

  const selected =
    (selectedGroupId ? memberships.find((item) => item.group.id === selectedGroupId) : null) || memberships[0];
  if (!selected) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    const payload: FixtureApiPayload = {
      period: "",
      periodLabel: "Sin fechas disponibles",
      cards: [],
      matches: [],
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

  const payload: FixtureApiPayload = {
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

  return NextResponse.json(payload, { status: 200 });
}

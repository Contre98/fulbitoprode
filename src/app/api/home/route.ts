import { NextResponse } from "next/server";
import { calculatePredictionPoints } from "@/lib/scoring";
import {
  fetchAvailableFechas,
  fetchLigaArgentinaFixtures,
  mapFixturesToHomeUpcomingMatches,
  mapFixturesToPronosticosMatches,
  resolveDefaultFecha
} from "@/lib/liga-live-provider";
import { listGroupMembersForGroups, listGroupPredictionsForGroups, listGroupsForUser } from "@/lib/m3-repo";
import { getSessionPocketBaseTokenFromRequest, getSessionUserIdFromRequest } from "@/lib/request-auth";
import type { FixtureDateCard, GroupCard } from "@/lib/types";

const HOME_SCOREMAP_TTL_MS = 120_000;
const homeScoreMapCache = new Map<string, { expiresAt: number; scoreMap: Map<string, { home: number; away: number }> }>();

function cloneScoreMap(source: Map<string, { home: number; away: number }>) {
  const next = new Map<string, { home: number; away: number }>();
  source.forEach((value, key) => {
    next.set(key, { home: value.home, away: value.away });
  });
  return next;
}

function toRankedRows(params: {
  members: Array<{ userId: string; name: string }>;
  predictions: Array<{
    userId: string;
    fixtureId: string;
    home: number | null;
    away: number | null;
  }>;
  scoreMap: Map<string, { home: number; away: number }>;
}) {
  const statsByUser = new Map<string, { userId: string; name: string; exact: number; winDraw: number; miss: number; points: number }>();

  params.members.forEach((member) => {
    statsByUser.set(member.userId, {
      userId: member.userId,
      name: member.name,
      exact: 0,
      winDraw: 0,
      miss: 0,
      points: 0
    });
  });

  params.predictions.forEach((prediction) => {
    if (prediction.home === null || prediction.away === null) {
      return;
    }

    const score = params.scoreMap.get(prediction.fixtureId);
    if (!score) {
      return;
    }

    const entry = statsByUser.get(prediction.userId);
    if (!entry) {
      return;
    }

    const points = calculatePredictionPoints(
      {
        home: prediction.home,
        away: prediction.away
      },
      score
    );

    entry.points += points;
    if (points === 3) {
      entry.exact += 1;
    } else if (points === 1) {
      entry.winDraw += 1;
    } else {
      entry.miss += 1;
    }
  });

  return [...statsByUser.values()]
    .sort((a, b) => b.points - a.points || b.exact - a.exact || a.name.localeCompare(b.name))
    .map((entry, index) => ({
      userId: entry.userId,
      rank: index + 1,
      points: entry.points
    }));
}

async function buildScoreMap(input: {
  periods: string[];
  leagueId: number;
  season: string;
  competitionStage?: "apertura" | "clausura" | "general";
}) {
  const cacheKey = `${input.leagueId}:${input.season}:${input.competitionStage || "general"}:${input.periods.join("|")}`;
  const now = Date.now();
  const cached = homeScoreMapCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cloneScoreMap(cached.scoreMap);
  }

  const scoreMap = new Map<string, { home: number; away: number }>();

  for (const period of input.periods) {
    const fixtures = await fetchLigaArgentinaFixtures({
      period,
      leagueId: input.leagueId,
      season: input.season,
      competitionStage: input.competitionStage
    });
    const matches = mapFixturesToPronosticosMatches(fixtures);
    matches.forEach((match) => {
      if (!match.score) {
        return;
      }
      scoreMap.set(match.id, {
        home: match.score.home,
        away: match.score.away
      });
    });
  }

  homeScoreMapCache.set(cacheKey, {
    expiresAt: now + HOME_SCOREMAP_TTL_MS,
    scoreMap
  });

  return scoreMap;
}

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  const pbToken = getSessionPocketBaseTokenFromRequest(request);
  if (!userId || !pbToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const selectedGroupId = searchParams.get("groupId")?.trim() || null;

  const memberships = await listGroupsForUser(userId, pbToken);
  if (memberships.length === 0) {
    return NextResponse.json(
      {
        groupCards: [] as GroupCard[],
        liveCards: [] as FixtureDateCard[],
        updatedAt: new Date().toISOString()
      },
      { status: 200 }
    );
  }

  const selected =
    (selectedGroupId ? memberships.find((item) => item.group.id === selectedGroupId) : null) || memberships[0];
  if (!selected) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const liveFechas = await fetchAvailableFechas({
    leagueId: selected.group.leagueId,
    season: selected.group.season,
    competitionStage: selected.group.competitionStage
  });
  const livePeriod =
    (await resolveDefaultFecha({
      leagueId: selected.group.leagueId,
      season: selected.group.season,
      competitionStage: selected.group.competitionStage,
      fechas: liveFechas
    })) || liveFechas[0] || "";

  const liveFixtures = livePeriod
    ? await fetchLigaArgentinaFixtures({
        period: livePeriod,
        leagueId: selected.group.leagueId,
        season: selected.group.season,
        competitionStage: selected.group.competitionStage
      })
    : [];

  const liveCards = mapFixturesToHomeUpcomingMatches(liveFixtures);

  const groupIds = memberships.map(({ group }) => group.id);
  const competitions = new Map<
    string,
    {
      leagueId: number;
      season: string;
      competitionStage?: "apertura" | "clausura" | "general";
    }
  >();

  memberships.forEach(({ group }) => {
    const key = `${group.leagueId}:${group.season}:${group.competitionStage || "general"}`;
    if (!competitions.has(key)) {
      competitions.set(key, {
        leagueId: group.leagueId,
        season: group.season,
        competitionStage: group.competitionStage
      });
    }
  });

  const [membersByGroup, predictionsByGroup, periodsByCompetitionEntries] = await Promise.all([
    listGroupMembersForGroups(groupIds, pbToken),
    listGroupPredictionsForGroups(
      {
        groupIds
      },
      pbToken
    ),
    Promise.all(
      [...competitions.entries()].map(async ([key, competition]) => {
        const periods = await fetchAvailableFechas({
          leagueId: competition.leagueId,
          season: competition.season,
          competitionStage: competition.competitionStage
        });
        return [key, periods] as const;
      })
    )
  ]);

  const periodsByCompetition = new Map<string, string[]>(periodsByCompetitionEntries);
  const scoreMapByCompetitionEntries = await Promise.all(
    [...competitions.entries()].map(async ([key, competition]) => {
      const scoreMap = await buildScoreMap({
        periods: periodsByCompetition.get(key) || [],
        leagueId: competition.leagueId,
        season: competition.season,
        competitionStage: competition.competitionStage
      });
      return [key, scoreMap] as const;
    })
  );

  const scoreMapByCompetition = new Map<string, Map<string, { home: number; away: number }>>(scoreMapByCompetitionEntries);
  const groupCards = memberships
    .map(({ group }) => {
      const competitionKey = `${group.leagueId}:${group.season}:${group.competitionStage || "general"}`;
      const members = membersByGroup[group.id] || [];
      const predictions = predictionsByGroup[group.id] || [];
      const scoreMap = scoreMapByCompetition.get(competitionKey) || new Map<string, { home: number; away: number }>();

      const rows = toRankedRows({
        members: members.map((member) => ({ userId: member.userId, name: member.name })),
        predictions,
        scoreMap
      });

      const currentUserRow = rows.find((row) => row.userId === userId);

      return {
        id: group.id,
        title: group.name,
        subtitle: `TEMP ${group.season} · ${members.length} JUG`,
        rank: currentUserRow ? `#${currentUserRow.rank}` : "--",
        points: currentUserRow ? String(currentUserRow.points) : "0",
        primary: group.id === selected.group.id
      } as GroupCard;
    })
    // Keep a stable visual order so horizontal swipe doesn't jump when active group changes.
    .sort((a, b) => a.title.localeCompare(b.title));

  return NextResponse.json(
    {
      groupCards,
      liveCards,
      updatedAt: new Date().toISOString()
    },
    { status: 200 }
  );
}

import { NextResponse } from "next/server";
import { calculatePredictionPoints } from "@/lib/scoring";
import { fetchLigaArgentinaFixtures } from "@/lib/liga-live-provider";
import { listGroupPredictionsForGroups, listGroupsForUser } from "@/lib/m3-repo";
import { getSessionPocketBaseTokenFromRequest, getSessionUserIdFromRequest } from "@/lib/request-auth";
import type { ProfileActivityItem, ProfilePayload } from "@/lib/types";

type CompetitionKey = string;

interface UserPrediction {
  groupId: string;
  fixtureId: string;
  period: string;
  home: number;
  away: number;
  submittedAt: string;
}

interface CompetitionScope {
  leagueId: number;
  season: string;
  competitionStage?: "apertura" | "clausura" | "general";
}

function toCompetitionKey(scope: CompetitionScope): CompetitionKey {
  return `${scope.leagueId}:${scope.season}:${scope.competitionStage || "general"}`;
}

function parseTimestamp(iso: string | undefined) {
  if (!iso) return 0;
  const parsed = new Date(iso).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  const pbToken = getSessionPocketBaseTokenFromRequest(request);
  if (!userId || !pbToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await listGroupsForUser(userId, pbToken);
  if (memberships.length === 0) {
    const emptyPayload: ProfilePayload = {
      stats: {
        totalPoints: 0,
        accuracyPct: 0,
        groups: 0
      },
      recentActivity: [],
      updatedAt: new Date().toISOString()
    };
    return NextResponse.json(emptyPayload, { status: 200 });
  }

  const groupIds = memberships.map((membership) => membership.group.id);
  const membershipByGroupId = new Map(memberships.map((membership) => [membership.group.id, membership]));
  const predictionsByGroup = await listGroupPredictionsForGroups({ groupIds }, pbToken);

  const userPredictions: UserPrediction[] = [];
  Object.entries(predictionsByGroup).forEach(([groupId, predictions]) => {
    predictions.forEach((prediction) => {
      if (prediction.userId !== userId || prediction.home === null || prediction.away === null || !prediction.period) {
        return;
      }
      userPredictions.push({
        groupId,
        fixtureId: prediction.fixtureId,
        period: prediction.period,
        home: prediction.home,
        away: prediction.away,
        submittedAt: prediction.submittedAt
      });
    });
  });

  const scopeByCompetition = new Map<CompetitionKey, CompetitionScope>();
  const periodsByCompetition = new Map<CompetitionKey, Set<string>>();

  userPredictions.forEach((prediction) => {
    const membership = membershipByGroupId.get(prediction.groupId);
    if (!membership) return;

    const scope: CompetitionScope = {
      leagueId: membership.group.leagueId,
      season: membership.group.season,
      competitionStage: membership.group.competitionStage
    };
    const key = toCompetitionKey(scope);
    if (!scopeByCompetition.has(key)) {
      scopeByCompetition.set(key, scope);
    }
    if (!periodsByCompetition.has(key)) {
      periodsByCompetition.set(key, new Set<string>());
    }
    periodsByCompetition.get(key)?.add(prediction.period);
  });

  const competitionEntries = [...scopeByCompetition.entries()];
  const fixturesByCompetitionEntries = await Promise.all(
    competitionEntries.map(async ([competitionKey, scope]) => {
      const periods = [...(periodsByCompetition.get(competitionKey) || new Set<string>())];
      const scoreMap = new Map<string, { home: number; away: number }>();
      const fixtureLabelMap = new Map<string, string>();

      await Promise.all(
        periods.map(async (period) => {
          try {
            const fixtures = await fetchLigaArgentinaFixtures({
              leagueId: scope.leagueId,
              season: scope.season,
              period,
              competitionStage: scope.competitionStage
            });

            fixtures.forEach((fixture) => {
              fixtureLabelMap.set(fixture.id, `${fixture.homeName} vs ${fixture.awayName}`);
              if (fixture.homeGoals === null || fixture.awayGoals === null) {
                return;
              }
              scoreMap.set(fixture.id, {
                home: fixture.homeGoals,
                away: fixture.awayGoals
              });
            });
          } catch {
            // If a provider call fails, keep building the profile payload with available data.
          }
        })
      );

      return [competitionKey, { scoreMap, fixtureLabelMap }] as const;
    })
  );

  const fixtureMapsByCompetition = new Map(
    fixturesByCompetitionEntries.map(([key, value]) => [key, value] as const)
  );

  let totalPoints = 0;
  let scoredPredictions = 0;
  let correctPredictions = 0;

  const predictionActivities: ProfileActivityItem[] = userPredictions.map((prediction) => {
    const membership = membershipByGroupId.get(prediction.groupId);
    const scopeKey = membership
      ? toCompetitionKey({
          leagueId: membership.group.leagueId,
          season: membership.group.season,
          competitionStage: membership.group.competitionStage
        })
      : "";
    const fixtureMaps = fixtureMapsByCompetition.get(scopeKey);
    const score = fixtureMaps?.scoreMap.get(prediction.fixtureId);

    let points: number | undefined;
    if (score) {
      points = calculatePredictionPoints(
        {
          home: prediction.home,
          away: prediction.away
        },
        score
      );
      totalPoints += points;
      scoredPredictions += 1;
      if (points > 0) {
        correctPredictions += 1;
      }
    }

    const fixtureLabel = fixtureMaps?.fixtureLabelMap.get(prediction.fixtureId) || prediction.fixtureId;
    return {
      id: `pred:${prediction.groupId}:${prediction.fixtureId}:${prediction.submittedAt}`,
      type: "prediction",
      label: `Pronóstico: ${fixtureLabel}`,
      occurredAt: prediction.submittedAt,
      points
    };
  });

  const joinActivities: ProfileActivityItem[] = memberships.map((membership) => ({
    id: `join:${membership.group.id}`,
    type: "group_join",
    label: `Te uniste a ${membership.group.name}`,
    occurredAt: membership.membership.joinedAt
  }));

  const recentActivity = [...predictionActivities, ...joinActivities]
    .sort((a, b) => parseTimestamp(b.occurredAt) - parseTimestamp(a.occurredAt))
    .slice(0, 3);

  const payload: ProfilePayload = {
    stats: {
      totalPoints,
      accuracyPct: scoredPredictions > 0 ? Math.round((correctPredictions / scoredPredictions) * 100) : 0,
      groups: memberships.length
    },
    recentActivity,
    updatedAt: new Date().toISOString()
  };

  return NextResponse.json(payload, { status: 200 });
}

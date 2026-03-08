import { jsonResponse } from "#http";
import { calculatePredictionPoints } from "@fulbito/domain";
import { getApiSession, unauthorizedJson } from "@fulbito/server-core/api-session";
import { fetchLigaArgentinaFixtures } from "@fulbito/server-core/liga-live-provider";
import { listGroupMembersForGroups, listGroupPredictionsForGroups, listGroupsForUser } from "@fulbito/server-core/m3-repo";
import { logServerEvent } from "@fulbito/server-core/observability";
function toCompetitionKey(scope) {
    return `${scope.leagueId}:${scope.season}:${scope.competitionStage || "general"}`;
}
function parseTimestamp(iso) {
    if (!iso)
        return 0;
    const parsed = new Date(iso).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
}
function periodSortValue(period) {
    const match = period.match(/\d+/);
    if (match) {
        return Number.parseInt(match[0], 10);
    }
    return Number.MAX_SAFE_INTEGER;
}
export async function GET(request) {
    const session = getApiSession(request);
    if (!session) {
        return unauthorizedJson();
    }
    const userId = session.userId;
    const pbToken = session.pbToken;
    const memberships = await listGroupsForUser(userId, pbToken);
    if (memberships.length === 0) {
        const emptyPayload = {
            stats: {
                totalPoints: 0,
                accuracyPct: 0,
                groups: 0
            },
            recentActivity: [],
            performance: null,
            achievements: [],
            rankHistory: [],
            weeklyWinner: null,
            updatedAt: new Date().toISOString()
        };
        return jsonResponse(emptyPayload, { status: 200 });
    }
    const groupIds = memberships.map((membership) => membership.group.id);
    const membershipByGroupId = new Map(memberships.map((membership) => [membership.group.id, membership]));
    const [predictionsByGroup, membersByGroup] = await Promise.all([
        listGroupPredictionsForGroups({ groupIds }, pbToken),
        listGroupMembersForGroups(groupIds, pbToken)
    ]);
    const userPredictions = [];
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
    const scopeByCompetition = new Map();
    const periodsByCompetition = new Map();
    Object.entries(predictionsByGroup).forEach(([groupId, predictions]) => {
        const membership = membershipByGroupId.get(groupId);
        if (!membership)
            return;
        const scope = {
            leagueId: membership.group.leagueId,
            season: membership.group.season,
            competitionStage: membership.group.competitionStage
        };
        const key = toCompetitionKey(scope);
        if (!scopeByCompetition.has(key)) {
            scopeByCompetition.set(key, scope);
        }
        if (!periodsByCompetition.has(key)) {
            periodsByCompetition.set(key, new Set());
        }
        predictions.forEach((prediction) => {
            if (prediction.period) {
                periodsByCompetition.get(key)?.add(prediction.period);
            }
        });
    });
    const competitionEntries = [...scopeByCompetition.entries()];
    const fixturesByCompetitionEntries = await Promise.all(competitionEntries.map(async ([competitionKey, scope]) => {
        const periods = [...(periodsByCompetition.get(competitionKey) || new Set())];
        const scoreMap = new Map();
        const fixtureLabelMap = new Map();
        await Promise.all(periods.map(async (period) => {
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
            }
            catch {
                // Keep profile payload resilient to provider failures.
            }
        }));
        return [competitionKey, { scoreMap, fixtureLabelMap }];
    }));
    const fixtureMapsByCompetition = new Map(fixturesByCompetitionEntries.map(([key, value]) => [key, value]));
    let totalPoints = 0;
    let scoredPredictions = 0;
    let exactPredictions = 0;
    let outcomePredictions = 0;
    let missPredictions = 0;
    const pointsByPeriod = new Map();
    const exactHitDates = [];
    const predictionActivities = userPredictions.map((prediction) => {
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
        let points;
        if (score) {
            points = calculatePredictionPoints({
                home: prediction.home,
                away: prediction.away
            }, score);
            totalPoints += points;
            scoredPredictions += 1;
            pointsByPeriod.set(prediction.period, (pointsByPeriod.get(prediction.period) || 0) + points);
            if (points === 3) {
                exactPredictions += 1;
                exactHitDates.push(prediction.submittedAt);
            }
            else if (points === 1) {
                outcomePredictions += 1;
            }
            else {
                missPredictions += 1;
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
    const joinActivities = memberships.map((membership) => ({
        id: `join:${membership.group.id}`,
        type: "group_join",
        label: `Te uniste a ${membership.group.name}`,
        occurredAt: membership.membership.joinedAt
    }));
    const recentActivity = [...predictionActivities, ...joinActivities]
        .sort((a, b) => parseTimestamp(b.occurredAt) - parseTimestamp(a.occurredAt))
        .slice(0, 3);
    const periodPointsRows = [...pointsByPeriod.entries()]
        .map(([period, points]) => ({
        period,
        periodLabel: period,
        points
    }))
        .sort((a, b) => periodSortValue(a.period) - periodSortValue(b.period));
    const averagePointsPerRound = periodPointsRows.length > 0 ? Math.round((totalPoints / periodPointsRows.length) * 10) / 10 : 0;
    const bestRound = periodPointsRows.length > 0 ? periodPointsRows.reduce((best, row) => (row.points > best.points ? row : best), periodPointsRows[0]) : null;
    const scoredActivitiesSorted = [...predictionActivities]
        .filter((item) => typeof item.points === "number")
        .sort((a, b) => parseTimestamp(b.occurredAt) - parseTimestamp(a.occurredAt));
    let streak = 0;
    for (const item of scoredActivitiesSorted) {
        if (item.points > 0) {
            streak += 1;
            continue;
        }
        break;
    }
    const achievements = [];
    if (exactPredictions > 0) {
        achievements.push({
            id: "first-exact",
            title: "Primera clavada",
            description: "Acertaste tu primer resultado exacto.",
            unlockedAt: exactHitDates.sort((a, b) => parseTimestamp(a) - parseTimestamp(b))[0] || new Date().toISOString()
        });
    }
    if (scoredPredictions >= 5 && Math.round(((exactPredictions + outcomePredictions) / scoredPredictions) * 100) >= 60) {
        achievements.push({
            id: "accuracy-60",
            title: "Precisión 60%",
            description: "Superaste 60% de aciertos en tus pronósticos cerrados.",
            unlockedAt: scoredActivitiesSorted[0]?.occurredAt || new Date().toISOString()
        });
    }
    if (totalPoints >= 30) {
        achievements.push({
            id: "thirty-points",
            title: "30 puntos",
            description: "Alcanzaste 30 puntos acumulados.",
            unlockedAt: scoredActivitiesSorted[0]?.occurredAt || new Date().toISOString()
        });
    }
    if (memberships.length >= 3) {
        const joinedSorted = memberships
            .map((membership) => membership.membership.joinedAt)
            .sort((a, b) => parseTimestamp(a) - parseTimestamp(b));
        achievements.push({
            id: "social-player",
            title: "Jugador social",
            description: "Te sumaste a 3 o más grupos.",
            unlockedAt: joinedSorted[Math.min(2, joinedSorted.length - 1)] || new Date().toISOString()
        });
    }
    const targetMembership = memberships[0];
    const targetGroupPredictions = targetMembership ? predictionsByGroup[targetMembership.group.id] || [] : [];
    const targetCompetitionKey = targetMembership
        ? toCompetitionKey({
            leagueId: targetMembership.group.leagueId,
            season: targetMembership.group.season,
            competitionStage: targetMembership.group.competitionStage
        })
        : "";
    const targetScoreMap = fixtureMapsByCompetition.get(targetCompetitionKey)?.scoreMap || new Map();
    const targetMembers = membersByGroup[targetMembership?.group.id || ""] || [];
    const memberNameById = new Map(targetMembers.map((member) => [member.userId, member.name]));
    const periodPointsByUser = new Map();
    targetGroupPredictions.forEach((prediction) => {
        if (prediction.home === null || prediction.away === null || !prediction.period) {
            return;
        }
        const score = targetScoreMap.get(prediction.fixtureId);
        if (!score) {
            return;
        }
        const points = calculatePredictionPoints({
            home: prediction.home,
            away: prediction.away
        }, score);
        const byPeriod = periodPointsByUser.get(prediction.userId) || new Map();
        byPeriod.set(prediction.period, (byPeriod.get(prediction.period) || 0) + points);
        periodPointsByUser.set(prediction.userId, byPeriod);
    });
    const targetPeriods = Array.from(new Set(targetGroupPredictions
        .map((prediction) => prediction.period)
        .filter((period) => Boolean(period)))).sort((a, b) => periodSortValue(a) - periodSortValue(b) || a.localeCompare(b));
    const cumulativeByUser = new Map();
    const rankHistory = [];
    targetPeriods.forEach((period) => {
        periodPointsByUser.forEach((pointsMap, scopedUserId) => {
            const periodPoints = pointsMap.get(period) || 0;
            cumulativeByUser.set(scopedUserId, (cumulativeByUser.get(scopedUserId) || 0) + periodPoints);
        });
        const ranking = [...cumulativeByUser.entries()]
            .map(([scopedUserId, points]) => ({ scopedUserId, points }))
            .sort((a, b) => b.points - a.points || (memberNameById.get(a.scopedUserId) || a.scopedUserId).localeCompare(memberNameById.get(b.scopedUserId) || b.scopedUserId));
        const myIndex = ranking.findIndex((row) => row.scopedUserId === userId);
        if (myIndex >= 0) {
            rankHistory.push({
                period,
                periodLabel: period,
                rank: myIndex + 1,
                points: ranking[myIndex].points
            });
        }
    });
    const lastPeriod = targetPeriods[targetPeriods.length - 1];
    let weeklyWinner = null;
    if (lastPeriod) {
        const periodRows = [...periodPointsByUser.entries()]
            .map(([scopedUserId, pointsMap]) => ({
            userId: scopedUserId,
            name: memberNameById.get(scopedUserId) || scopedUserId,
            points: pointsMap.get(lastPeriod) || 0
        }))
            .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
        if (periodRows.length > 0 && periodRows[0].points > 0) {
            weeklyWinner = {
                period: lastPeriod,
                periodLabel: lastPeriod,
                winnerName: periodRows[0].name,
                points: periodRows[0].points,
                tied: periodRows.filter((row) => row.points === periodRows[0].points).length > 1 ? true : undefined
            };
        }
    }
    const accuracyPct = scoredPredictions > 0 ? Math.round(((exactPredictions + outcomePredictions) / scoredPredictions) * 100) : 0;
    const payload = {
        stats: {
            totalPoints,
            accuracyPct,
            groups: memberships.length
        },
        recentActivity,
        performance: {
            exactHitRatePct: scoredPredictions > 0 ? Math.round((exactPredictions / scoredPredictions) * 100) : 0,
            outcomeHitRatePct: scoredPredictions > 0 ? Math.round((outcomePredictions / scoredPredictions) * 100) : 0,
            misses: missPredictions,
            averagePointsPerRound,
            bestRound: bestRound
                ? {
                    period: bestRound.period,
                    periodLabel: bestRound.periodLabel,
                    userName: "Vos",
                    points: bestRound.points
                }
                : null,
            streak
        },
        achievements,
        rankHistory,
        weeklyWinner,
        updatedAt: new Date().toISOString()
    };
    logServerEvent("profile.payload.served", {
        userId,
        groups: memberships.length,
        achievements: achievements.length
    });
    return jsonResponse(payload, { status: 200 });
}

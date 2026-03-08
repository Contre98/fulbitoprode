import { jsonResponse } from "#http";
import { calculatePredictionPoints } from "@fulbito/domain";
import { fetchAvailableFechas, fetchLigaArgentinaFixtures, mapFixturesToHomeUpcomingMatches, mapFixturesToPronosticosMatches, resolveDefaultFecha } from "@fulbito/server-core/liga-live-provider";
import { getApiSession, unauthorizedJson } from "@fulbito/server-core/api-session";
import { listGroupMembersForGroups, listGroupPredictionsForGroups, listGroupsForUser } from "@fulbito/server-core/m3-repo";
import { logServerEvent } from "@fulbito/server-core/observability";
const HOME_SCOREMAP_TTL_MS = 120_000;
const homeScoreMapCache = new Map();
function cloneScoreMap(source) {
    const next = new Map();
    source.forEach((value, key) => {
        next.set(key, { home: value.home, away: value.away });
    });
    return next;
}
function toRankedRows(params) {
    const statsByUser = new Map();
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
        const points = calculatePredictionPoints({
            home: prediction.home,
            away: prediction.away
        }, score);
        entry.points += points;
        if (points === 3) {
            entry.exact += 1;
        }
        else if (points === 1) {
            entry.winDraw += 1;
        }
        else {
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
function toWeeklyWinnerSummary(params) {
    const pointsByUser = new Map();
    params.members.forEach((member) => {
        pointsByUser.set(member.userId, {
            name: member.name,
            points: 0
        });
    });
    params.predictions.forEach((prediction) => {
        if (!params.fixtureIds.has(prediction.fixtureId)) {
            return;
        }
        if (prediction.home === null || prediction.away === null) {
            return;
        }
        const score = params.scoreMap.get(prediction.fixtureId);
        if (!score) {
            return;
        }
        const row = pointsByUser.get(prediction.userId);
        if (!row) {
            return;
        }
        row.points += calculatePredictionPoints({
            home: prediction.home,
            away: prediction.away
        }, score);
    });
    const ordered = [...pointsByUser.values()].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
    if (ordered.length === 0 || ordered[0].points <= 0) {
        return null;
    }
    const topPoints = ordered[0].points;
    const winners = ordered.filter((row) => row.points === topPoints);
    return {
        period: params.period,
        periodLabel: params.periodLabel,
        winnerName: winners[0].name,
        points: topPoints,
        tied: winners.length > 1 ? true : undefined
    };
}
async function buildScoreMap(input) {
    const cacheKey = `${input.leagueId}:${input.season}:${input.competitionStage || "general"}:${input.periods.join("|")}`;
    const now = Date.now();
    const cached = homeScoreMapCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
        return cloneScoreMap(cached.scoreMap);
    }
    const scoreMap = new Map();
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
export async function GET(request) {
    const session = getApiSession(request);
    if (!session) {
        return unauthorizedJson();
    }
    const userId = session.userId;
    const pbToken = session.pbToken;
    const { searchParams } = new URL(request.url);
    const selectedGroupId = searchParams.get("groupId")?.trim() || null;
    const memberships = await listGroupsForUser(userId, pbToken);
    if (memberships.length === 0) {
        const emptyPayload = {
            groupCards: [],
            liveCards: [],
            updatedAt: new Date().toISOString(),
            summary: {
                pendingPredictions: 0,
                liveMatches: 0,
                myRank: undefined,
                myPoints: 0
            }
        };
        return jsonResponse(emptyPayload, { status: 200 });
    }
    const selected = (selectedGroupId ? memberships.find((item) => item.group.id === selectedGroupId) : null) || memberships[0];
    if (!selected) {
        return jsonResponse({ error: "Forbidden" }, { status: 403 });
    }
    const liveFechas = await fetchAvailableFechas({
        leagueId: selected.group.leagueId,
        season: selected.group.season,
        competitionStage: selected.group.competitionStage
    });
    const livePeriod = (await resolveDefaultFecha({
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
    const selectedPeriodMatches = mapFixturesToPronosticosMatches(liveFixtures);
    const groupIds = memberships.map(({ group }) => group.id);
    const competitions = new Map();
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
        listGroupPredictionsForGroups({
            groupIds
        }, pbToken),
        Promise.all([...competitions.entries()].map(async ([key, competition]) => {
            const periods = await fetchAvailableFechas({
                leagueId: competition.leagueId,
                season: competition.season,
                competitionStage: competition.competitionStage
            });
            return [key, periods];
        }))
    ]);
    const periodsByCompetition = new Map(periodsByCompetitionEntries);
    const scoreMapByCompetitionEntries = await Promise.all([...competitions.entries()].map(async ([key, competition]) => {
        const scoreMap = await buildScoreMap({
            periods: periodsByCompetition.get(key) || [],
            leagueId: competition.leagueId,
            season: competition.season,
            competitionStage: competition.competitionStage
        });
        return [key, scoreMap];
    }));
    const scoreMapByCompetition = new Map(scoreMapByCompetitionEntries);
    const groupCards = memberships
        .map(({ group }) => {
        const competitionKey = `${group.leagueId}:${group.season}:${group.competitionStage || "general"}`;
        const members = membersByGroup[group.id] || [];
        const predictions = predictionsByGroup[group.id] || [];
        const scoreMap = scoreMapByCompetition.get(competitionKey) || new Map();
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
        };
    })
        // Keep a stable visual order so horizontal swipe doesn't jump when active group changes.
        .sort((a, b) => a.title.localeCompare(b.title));
    const selectedPredictions = predictionsByGroup[selected.group.id] || [];
    const selectedPredictionByFixture = new Map();
    selectedPredictions.forEach((prediction) => {
        if (!selectedPredictionByFixture.has(prediction.fixtureId)) {
            selectedPredictionByFixture.set(prediction.fixtureId, {
                home: prediction.home,
                away: prediction.away
            });
        }
    });
    const pendingPredictions = selectedPeriodMatches
        .filter((match) => match.status === "upcoming")
        .filter((match) => {
        const prediction = selectedPredictionByFixture.get(match.id);
        return !(prediction && prediction.home !== null && prediction.away !== null);
    }).length;
    const selectedCard = groupCards.find((card) => card.id === selected.group.id);
    const parsedRank = selectedCard?.rank ? Number(selectedCard.rank.replace(/[^0-9]/g, "")) : null;
    const parsedPoints = selectedCard?.points ? Number(selectedCard.points) : null;
    const selectedMembers = membersByGroup[selected.group.id] || [];
    const selectedCompetitionKey = `${selected.group.leagueId}:${selected.group.season}:${selected.group.competitionStage || "general"}`;
    const selectedScoreMap = scoreMapByCompetition.get(selectedCompetitionKey) || new Map();
    const weeklyWinner = toWeeklyWinnerSummary({
        period: livePeriod,
        periodLabel: livePeriod ? (livePeriod.toLowerCase().includes("fecha") ? livePeriod : `Fecha ${livePeriod}`) : "Última fecha",
        members: selectedMembers.map((member) => ({ userId: member.userId, name: member.name })),
        predictions: selectedPredictions,
        fixtureIds: new Set(selectedPeriodMatches.map((match) => match.id)),
        scoreMap: selectedScoreMap
    });
    const payload = {
        groupCards,
        liveCards,
        updatedAt: new Date().toISOString(),
        summary: {
            pendingPredictions,
            liveMatches: selectedPeriodMatches.filter((match) => match.status === "live").length,
            myRank: parsedRank && Number.isFinite(parsedRank) ? parsedRank : undefined,
            myPoints: parsedPoints && Number.isFinite(parsedPoints) ? parsedPoints : 0,
            weeklyWinner
        }
    };
    logServerEvent("home.payload.served", {
        userId,
        groupId: selected.group.id,
        liveMatches: payload.summary?.liveMatches ?? 0
    });
    return jsonResponse(payload, { status: 200 });
}

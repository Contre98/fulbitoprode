import { NextResponse } from "next/server";
import { calculatePredictionPoints, parseLeaderboardRecord } from "@fulbito/domain";
import { fetchAvailableFechas, fetchLigaArgentinaFixtures, fetchLigaArgentinaStandings, formatRoundLabel, mapFixturesToPronosticosMatches } from "@/lib/liga-live-provider";
import { listGroupMembers, listGroupPredictions, listGroupsForUser } from "@/lib/m3-repo";
import { getSessionPocketBaseTokenFromRequest, getSessionUserIdFromRequest } from "@/lib/request-auth";
import type {
  LeaderboardGroupStats,
  LeaderboardMode,
  LeaderboardPayload,
  LeaderboardPeriod,
  LeaderboardRow,
  MatchCardData,
  MatchPeriod
} from "@/lib/types";

const LEADERBOARD_SCOREMAP_TTL_MS = 120_000;
const leaderboardScoreMapCache = new Map<
  string,
  {
    expiresAt: number;
    scoreMap: Map<string, { home: number; away: number }>;
    scoreMapByPeriod: Map<string, Map<string, { home: number; away: number }>>;
  }
>();

function cloneScoreMap(source: Map<string, { home: number; away: number }>) {
  const next = new Map<string, { home: number; away: number }>();
  source.forEach((value, key) => {
    next.set(key, { home: value.home, away: value.away });
  });
  return next;
}

function cloneScoreMapByPeriod(source: Map<string, Map<string, { home: number; away: number }>>) {
  const next = new Map<string, Map<string, { home: number; away: number }>>();
  source.forEach((scoreMap, period) => {
    next.set(period, cloneScoreMap(scoreMap));
  });
  return next;
}

function toLeaderboardRows(rows: LeaderboardRow[]): LeaderboardRow[] {
  return rows.map((row, index) => ({
    ...row,
    rank: index + 1,
    highlight: index === 0
  }));
}

function rowKey(row: Pick<LeaderboardRow, "userId" | "name">) {
  return row.userId || row.name.trim().toLowerCase();
}

function longestConsecutive(values: number[], predicate: (value: number) => boolean) {
  let current = 0;
  let best = 0;

  values.forEach((value) => {
    if (predicate(value)) {
      current += 1;
      if (current > best) {
        best = current;
      }
      return;
    }

    current = 0;
  });

  return best;
}

function pickWinner<T>(entries: T[], score: (entry: T) => number, tiebreak: (a: T, b: T) => number) {
  if (entries.length === 0) {
    return null;
  }

  return [...entries].sort((a, b) => {
    const scoreDelta = score(b) - score(a);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }
    return tiebreak(a, b);
  })[0];
}

function copyMatches(matches: MatchCardData[]): MatchCardData[] {
  return matches.map((match) => ({
    ...match,
    homeTeam: { ...match.homeTeam },
    awayTeam: { ...match.awayTeam },
    score: match.score ? { ...match.score } : undefined,
    prediction: match.prediction ? { ...match.prediction } : undefined,
    meta: { ...match.meta },
    points: match.points ? { ...match.points } : undefined
  }));
}

async function getPeriodMatches(input: {
  leagueId: number;
  season: string;
  period: MatchPeriod;
  competitionStage?: "apertura" | "clausura" | "general";
}) {
  const liveFixtures = await fetchLigaArgentinaFixtures({
    leagueId: input.leagueId,
    season: input.season,
    period: input.period,
    competitionStage: input.competitionStage
  });

  return copyMatches(mapFixturesToPronosticosMatches(liveFixtures));
}

async function buildFixtureScoreMaps(input: {
  leagueId: number;
  season: string;
  periods: MatchPeriod[];
  competitionStage?: "apertura" | "clausura" | "general";
}) {
  const cacheKey = `${input.leagueId}:${input.season}:${input.competitionStage || "general"}:${input.periods.join("|")}`;
  const now = Date.now();
  const cached = leaderboardScoreMapCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return {
      scoreMap: cloneScoreMap(cached.scoreMap),
      scoreMapByPeriod: cloneScoreMapByPeriod(cached.scoreMapByPeriod)
    };
  }

  const scoreMap = new Map<string, { home: number; away: number }>();
  const scoreMapByPeriod = new Map<string, Map<string, { home: number; away: number }>>();

  for (const period of input.periods) {
    const matches = await getPeriodMatches({
      leagueId: input.leagueId,
      season: input.season,
      period,
      competitionStage: input.competitionStage
    });

    const periodScoreMap = new Map<string, { home: number; away: number }>();
    for (const match of matches) {
      if (!match.score) {
        continue;
      }

      const score = {
        home: match.score.home,
        away: match.score.away
      };

      scoreMap.set(match.id, score);
      periodScoreMap.set(match.id, score);
    }

    scoreMapByPeriod.set(period, periodScoreMap);
  }

  leaderboardScoreMapCache.set(cacheKey, {
    expiresAt: now + LEADERBOARD_SCOREMAP_TTL_MS,
    scoreMap,
    scoreMapByPeriod
  });

  return {
    scoreMap: cloneScoreMap(scoreMap),
    scoreMapByPeriod: cloneScoreMapByPeriod(scoreMapByPeriod)
  };
}

function buildRows(params: {
  mode: LeaderboardMode;
  members: Array<{ userId: string; name: string }>;
  predictions: Array<{
    userId: string;
    fixtureId: string;
    home: number | null;
    away: number | null;
  }>;
  scoreMap: Map<string, { home: number; away: number }>;
}) {
  const statsByUser = new Map<
    string,
    {
      userId: string;
      name: string;
      exact: number;
      winDraw: number;
      miss: number;
      scoredPredictions: number;
      points: number;
    }
  >();

  params.members.forEach((member) => {
    statsByUser.set(member.userId, {
      userId: member.userId,
      name: member.name,
      exact: 0,
      winDraw: 0,
      miss: 0,
      scoredPredictions: 0,
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

    const userStats = statsByUser.get(prediction.userId);
    if (!userStats) {
      return;
    }

    const points = calculatePredictionPoints(
      {
        home: prediction.home,
        away: prediction.away
      },
      score
    );

    userStats.scoredPredictions += 1;
    userStats.points += points;

    if (points === 3) {
      userStats.exact += 1;
      return;
    }

    if (points === 1) {
      userStats.winDraw += 1;
      return;
    }

    userStats.miss += 1;
  });

  const rows = [...statsByUser.values()].map<LeaderboardRow>((entry) => {
    const record = `${entry.exact}/${entry.winDraw}/${entry.miss}`;
    if (params.mode === "stats") {
      const efficiency = entry.scoredPredictions > 0 ? Math.round((entry.points / (entry.scoredPredictions * 3)) * 100) : 0;
      return {
        rank: 0,
        userId: entry.userId,
        name: entry.name,
        predictions: entry.exact,
        record,
        points: efficiency,
        deltaRank: 0,
        streak: entry.exact
      };
    }

    return {
      rank: 0,
      userId: entry.userId,
      name: entry.name,
      predictions: entry.scoredPredictions,
      record,
      points: entry.points,
      deltaRank: 0,
      streak: entry.exact
    };
  });

  rows.sort((a, b) => b.points - a.points || b.predictions - a.predictions || a.name.localeCompare(b.name));
  return toLeaderboardRows(rows);
}

function buildGroupStats(input: {
  members: Array<{ userId: string; name: string }>;
  predictions: Array<{ userId: string; fixtureId: string; period: string; home: number | null; away: number | null }>;
  scoreMapByPeriod: Map<string, Map<string, { home: number; away: number }>>;
  standings: Awaited<ReturnType<typeof fetchLigaArgentinaStandings>>;
}): LeaderboardGroupStats {
  const memberNameById = new Map<string, string>();

  input.members.forEach((member) => {
    memberNameById.set(member.userId, member.name);
  });

  let scoredPredictions = 0;
  let exactPredictions = 0;
  let resultPredictions = 0;
  let missPredictions = 0;
  let totalPoints = 0;

  const pointsByFechaUser = new Map<string, Map<string, number>>();

  input.predictions.forEach((prediction) => {
    if (prediction.home === null || prediction.away === null) {
      return;
    }

    const periodScoreMap = input.scoreMapByPeriod.get(prediction.period);
    if (!periodScoreMap) {
      return;
    }

    const score = periodScoreMap.get(prediction.fixtureId);
    if (!score) {
      return;
    }

    const points = calculatePredictionPoints(
      {
        home: prediction.home,
        away: prediction.away
      },
      score
    );

    scoredPredictions += 1;
    totalPoints += points;

    if (!pointsByFechaUser.has(prediction.period)) {
      pointsByFechaUser.set(prediction.period, new Map<string, number>());
    }
    const periodPoints = pointsByFechaUser.get(prediction.period);
    if (periodPoints) {
      periodPoints.set(prediction.userId, (periodPoints.get(prediction.userId) || 0) + points);
    }

    if (points === 3) {
      exactPredictions += 1;
      return;
    }

    if (points === 1) {
      resultPredictions += 1;
      return;
    }

    missPredictions += 1;
  });

  let bestFecha: LeaderboardGroupStats["bestFecha"] = null;
  let worstFecha: LeaderboardGroupStats["worstFecha"] = null;

  pointsByFechaUser.forEach((pointsByUserInPeriod, period) => {
    pointsByUserInPeriod.forEach((points, userId) => {
      const userName = memberNameById.get(userId) || `Usuario ${userId.slice(0, 6)}`;
      const candidate = {
        period,
        periodLabel: formatRoundLabel(period),
        userId,
        userName,
        points
      };

      if (!bestFecha || candidate.points > bestFecha.points || (candidate.points === bestFecha.points && candidate.userName.localeCompare(bestFecha.userName) < 0)) {
        bestFecha = candidate;
      }
      if (!worstFecha || candidate.points < worstFecha.points || (candidate.points === worstFecha.points && candidate.userName.localeCompare(worstFecha.userName) < 0)) {
        worstFecha = candidate;
      }
    });
  });

  const memberCount = input.members.length;
  const correctPredictions = exactPredictions + resultPredictions;
  const accuracyPct = scoredPredictions > 0 ? Math.round((correctPredictions / scoredPredictions) * 100) : 0;
  const averageMemberPoints = memberCount > 0 ? Math.round((totalPoints / memberCount) * 10) / 10 : 0;

  const leaderPoints = input.standings?.rows?.length ? Math.max(...input.standings.rows.map((row) => row.points)) : null;
  const worldBenchmark =
    leaderPoints && leaderPoints > 0
      ? {
          leagueName: input.standings?.leagueName || "Liga",
          leaderPoints,
          groupTotalPoints: totalPoints,
          averageMemberPoints,
          ratioVsLeaderPct: Math.round((totalPoints / leaderPoints) * 100)
        }
      : null;

  return {
    memberCount,
    scoredPredictions,
    correctPredictions,
    exactPredictions,
    resultPredictions,
    missPredictions,
    accuracyPct,
    totalPoints,
    averageMemberPoints,
    bestFecha,
    worstFecha,
    worldBenchmark
  };
}

interface LeaderboardPeriodSnapshot {
  period: string;
  periodLabel: string;
  rows: LeaderboardRow[];
}

function buildPeriodSnapshots(input: {
  members: Array<{ userId: string; name: string }>;
  predictions: Array<{ userId: string; fixtureId: string; period: string; home: number | null; away: number | null }>;
  scoreMapByPeriod: Map<string, Map<string, { home: number; away: number }>>;
  periods: string[];
}) {
  const seen = new Set<string>();
  const orderedPeriods = input.periods.filter((period) => {
    if (seen.has(period)) return false;
    seen.add(period);
    return true;
  });

  const snapshots: LeaderboardPeriodSnapshot[] = [];
  orderedPeriods.forEach((period) => {
    const periodPredictions = input.predictions.filter((prediction) => prediction.period === period);
    const periodRows = buildRows({
      mode: "posiciones",
      members: input.members,
      predictions: periodPredictions,
      scoreMap: input.scoreMapByPeriod.get(period) || new Map<string, { home: number; away: number }>()
    });
    snapshots.push({
      period,
      periodLabel: formatRoundLabel(period),
      rows: periodRows
    });
  });

  return snapshots;
}

function buildStatsAwards(input: { rows: LeaderboardRow[]; periodSnapshots: LeaderboardPeriodSnapshot[] }): NonNullable<LeaderboardPayload["stats"]>["awards"] {
  interface StatsEntry {
    key: string;
    userId?: string;
    name: string;
    exact: number;
    result: number;
    miss: number;
    positiveStreak: number;
    zeroStreak: number;
    batacazoCount: number;
    robinDifficultHits: number;
    robinEasyFails: number;
    casiCount: number;
  }

  const metricsByUser = new Map<string, StatsEntry>();
  const timelineByUser = new Map<
    string,
    {
      name: string;
      points: number[];
      batacazoCount: number;
      robinDifficultHits: number;
      robinEasyFails: number;
    }
  >();

  const ensureTimeline = (key: string, name: string) => {
    const current = timelineByUser.get(key);
    if (current) {
      return current;
    }
    const next = {
      name,
      points: [] as number[],
      batacazoCount: 0,
      robinDifficultHits: 0,
      robinEasyFails: 0
    };
    timelineByUser.set(key, next);
    return next;
  };

  input.rows.forEach((row) => {
    const key = rowKey(row);
    const parsed = parseLeaderboardRecord(row.record);
    metricsByUser.set(key, {
      key,
      userId: row.userId,
      name: row.name,
      exact: parsed.exact,
      result: parsed.outcome,
      miss: parsed.miss,
      positiveStreak: 0,
      zeroStreak: 0,
      batacazoCount: 0,
      robinDifficultHits: 0,
      robinEasyFails: 0,
      casiCount: Math.max(parsed.outcome - parsed.exact, 0)
    });
    ensureTimeline(key, row.name);
  });

  input.periodSnapshots.forEach((snapshot) => {
    const periodRowsByUser = new Map(snapshot.rows.map((row) => [rowKey(row), row] as const));
    const allUserKeys = new Set<string>([...timelineByUser.keys(), ...periodRowsByUser.keys()]);

    allUserKeys.forEach((userKey) => {
      const row = periodRowsByUser.get(userKey);
      const userName = row?.name || timelineByUser.get(userKey)?.name || "Participante";
      const timeline = ensureTimeline(userKey, userName);
      timeline.points.push(row?.points ?? 0);

      if (!metricsByUser.has(userKey)) {
        const parsed = parseLeaderboardRecord(row?.record || "0/0/0");
        metricsByUser.set(userKey, {
          key: userKey,
          userId: row?.userId,
          name: userName,
          exact: parsed.exact,
          result: parsed.outcome,
          miss: parsed.miss,
          positiveStreak: 0,
          zeroStreak: 0,
          batacazoCount: 0,
          robinDifficultHits: 0,
          robinEasyFails: 0,
          casiCount: Math.max(parsed.outcome - parsed.exact, 0)
        });
      }
    });

    const scorers = snapshot.rows.filter((row) => row.points > 0);
    if (snapshot.rows.length > 1 && scorers.length === 1) {
      const ownerKey = rowKey(scorers[0]);
      const ownerTimeline = ensureTimeline(ownerKey, scorers[0].name);
      ownerTimeline.batacazoCount += 1;
      ownerTimeline.robinDifficultHits += 1;
    }

    snapshot.rows.forEach((row) => {
      if (row.points > 0) return;
      const others = snapshot.rows.filter((candidate) => rowKey(candidate) !== rowKey(row));
      if (others.length > 0 && others.every((candidate) => candidate.points > 0)) {
        const timeline = ensureTimeline(rowKey(row), row.name);
        timeline.robinEasyFails += 1;
      }
    });
  });

  const entries = [...metricsByUser.values()].map((entry) => {
    const timeline = timelineByUser.get(entry.key);
    const points = timeline?.points || [];
    return {
      ...entry,
      positiveStreak: longestConsecutive(points, (value) => value > 0),
      zeroStreak: longestConsecutive(points, (value) => value === 0),
      batacazoCount: timeline?.batacazoCount || 0,
      robinDifficultHits: timeline?.robinDifficultHits || 0,
      robinEasyFails: timeline?.robinEasyFails || 0
    };
  });

  const byName = (a: StatsEntry, b: StatsEntry) => a.name.localeCompare(b.name, "es");
  const fallbackEntry: StatsEntry = {
    key: "fallback",
    userId: undefined,
    name: "Sin datos",
    exact: 0,
    result: 0,
    miss: 0,
    positiveStreak: 0,
    zeroStreak: 0,
    batacazoCount: 0,
    robinDifficultHits: 0,
    robinEasyFails: 0,
    casiCount: 0
  };

  const nostradamus = pickWinner(entries, (entry) => entry.exact, (a, b) => b.result - a.result || byName(a, b)) || fallbackEntry;
  const bilardistaPool = entries.filter((entry) => entry.exact === 0);
  const bilardista =
    pickWinner(
      bilardistaPool.length > 0 ? bilardistaPool : entries,
      (entry) => entry.result,
      (a, b) => a.miss - b.miss || byName(a, b)
    ) || fallbackEntry;
  const laRacha = pickWinner(entries, (entry) => entry.positiveStreak, (a, b) => b.exact - a.exact || byName(a, b)) || fallbackEntry;
  const batacazo = pickWinner(entries, (entry) => entry.batacazoCount, (a, b) => b.result - a.result || byName(a, b)) || fallbackEntry;
  const robinHood =
    pickWinner(
      entries,
      (entry) => entry.robinDifficultHits * 10 + entry.robinEasyFails,
      (a, b) => b.robinDifficultHits - a.robinDifficultHits || byName(a, b)
    ) || fallbackEntry;
  const elCasi = pickWinner(entries, (entry) => entry.casiCount, (a, b) => b.result - a.result || byName(a, b)) || fallbackEntry;
  const elMufa = pickWinner(entries, (entry) => entry.zeroStreak, (a, b) => b.miss - a.miss || byName(a, b)) || fallbackEntry;

  const createAward = (input: {
    id: string;
    title: string;
    winner: StatsEntry;
    subtitle: string;
    metricValue: number;
  }) => ({
    id: input.id,
    title: input.title,
    winnerUserId: input.winner.userId,
    winnerName: input.winner.name,
    subtitle: input.subtitle,
    metricValue: input.metricValue
  });

  return [
    createAward({
      id: "nostradamus",
      title: "NOSTRADAMUS",
      winner: nostradamus,
      subtitle: `Mayor cantidad de plenos (${nostradamus.exact})`,
      metricValue: nostradamus.exact
    }),
    createAward({
      id: "bilardista",
      title: "BILARDISTA",
      winner: bilardista,
      subtitle: `Suma con lo justo. ${bilardista.result} resultados y 0 plenos.`,
      metricValue: bilardista.result
    }),
    createAward({
      id: "la-racha",
      title: "LA RACHA",
      winner: laRacha,
      subtitle: `${laRacha.positiveStreak} fechas sumando seguido`,
      metricValue: laRacha.positiveStreak
    }),
    createAward({
      id: "batacazo",
      title: "BATACAZO",
      winner: batacazo,
      subtitle: `Único acierto grupal (${batacazo.batacazoCount})`,
      metricValue: batacazo.batacazoCount
    }),
    createAward({
      id: "robin-hood",
      title: "ROBIN HOOD",
      winner: robinHood,
      subtitle: `Acierta difíciles (${robinHood.robinDifficultHits}), erra fáciles (${robinHood.robinEasyFails})`,
      metricValue: robinHood.robinDifficultHits * 10 + robinHood.robinEasyFails
    }),
    createAward({
      id: "el-casi",
      title: 'EL "CASI"',
      winner: elCasi,
      subtitle: `Resultado sí, pleno no por 1 gol (${elCasi.casiCount})`,
      metricValue: elCasi.casiCount
    }),
    createAward({
      id: "el-mufa",
      title: "EL MUFA",
      winner: elMufa,
      subtitle: `${elMufa.zeroStreak} fechas sin sumar nada`,
      metricValue: elMufa.zeroStreak
    })
  ];
}

function buildHistoricalSeries(input: {
  members: Array<{ userId: string; name: string }>;
  periodSnapshots: LeaderboardPeriodSnapshot[];
}): NonNullable<LeaderboardPayload["stats"]>["historicalSeries"] {
  return input.members.map((member) => ({
    userId: member.userId,
    userName: member.name,
    points: input.periodSnapshots.map((snapshot) => {
      const row = snapshot.rows.find((candidate) => candidate.userId === member.userId);
      return {
        period: snapshot.period,
        periodLabel: snapshot.periodLabel,
        rank: row?.rank ?? snapshot.rows.length + 1,
        points: row?.points ?? 0
      };
    })
  }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const modeParam = searchParams.get("mode");
  const periodParam = searchParams.get("period")?.trim() || "global";
  const selectedGroupId = searchParams.get("groupId")?.trim() || null;

  const mode: LeaderboardMode = modeParam === "stats" ? "stats" : "posiciones";
  const period: LeaderboardPeriod = periodParam === "global" ? "global" : periodParam;

  const userId = getSessionUserIdFromRequest(request);
  const pbToken = getSessionPocketBaseTokenFromRequest(request);
  if (!userId || !pbToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await listGroupsForUser(userId, pbToken);
  if (memberships.length === 0) {
    const payload: LeaderboardPayload = {
      groupLabel: "Sin grupo activo",
      mode,
      period,
      periodLabel: period === "global" ? "Global acumulado" : formatRoundLabel(period),
      updatedAt: new Date().toISOString(),
      rows: [],
      groupStats: null,
      stats: null
    };
    return NextResponse.json(payload, { status: 200 });
  }

  const selectedMembership =
    (selectedGroupId ? memberships.find((item) => item.group.id === selectedGroupId) : null) || memberships[0];

  if (!selectedMembership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const groupId = selectedMembership.group.id;
  const leagueId = selectedMembership.group.leagueId;
  const season = selectedMembership.group.season;

  let periods: MatchPeriod[] = [];
  if (period === "global") {
    periods = await fetchAvailableFechas({
      leagueId,
      season,
      competitionStage: selectedMembership.group.competitionStage
    });
  } else {
    periods = [String(period)];
  }

  try {
    const [members, predictions, scoreMaps] = await Promise.all([
      listGroupMembers(groupId, pbToken),
      listGroupPredictions(
        {
          groupId,
          period: period === "global" ? undefined : String(period)
        },
        pbToken
      ),
      buildFixtureScoreMaps({
        leagueId,
        season,
        periods,
        competitionStage: selectedMembership.group.competitionStage
      })
    ]);

    const memberRows = members.map((member) => ({
      userId: member.userId,
      name: member.name
    }));

    const rows = buildRows({
      mode,
      members: memberRows,
      predictions,
      scoreMap: scoreMaps.scoreMap
    });

    let groupStats: LeaderboardPayload["groupStats"] = null;
    let stats: LeaderboardPayload["stats"] = null;

    if (mode === "stats") {
      const allPredictions =
        period === "global"
          ? predictions
          : await listGroupPredictions(
              {
                groupId
              },
              pbToken
            );

      const allPeriods = [...new Set(allPredictions.map((prediction) => prediction.period).filter(Boolean))];
      const allPeriodScoreMaps =
        allPeriods.length > 0
          ? await buildFixtureScoreMaps({
              leagueId,
              season,
              periods: allPeriods,
              competitionStage: selectedMembership.group.competitionStage
            })
          : { scoreMap: new Map<string, { home: number; away: number }>(), scoreMapByPeriod: new Map<string, Map<string, { home: number; away: number }>>() };

      const standings = await fetchLigaArgentinaStandings({
        leagueId,
        season
      });

      groupStats = buildGroupStats({
        members: memberRows,
        predictions: allPredictions,
        scoreMapByPeriod: allPeriodScoreMaps.scoreMapByPeriod,
        standings
      });

      const periodsForHistory = allPeriods.length > 0 ? allPeriods : periods.map((value) => String(value));
      const periodSnapshots = buildPeriodSnapshots({
        members: memberRows,
        predictions: allPredictions,
        scoreMapByPeriod: allPeriodScoreMaps.scoreMapByPeriod,
        periods: periodsForHistory
      });
      const globalReferenceRows = buildRows({
        mode: "posiciones",
        members: memberRows,
        predictions: allPredictions,
        scoreMap: allPeriodScoreMaps.scoreMap
      });

      stats = {
        summary: {
          memberCount: groupStats.memberCount,
          scoredPredictions: groupStats.scoredPredictions,
          correctPredictions: groupStats.correctPredictions,
          exactPredictions: groupStats.exactPredictions,
          resultPredictions: groupStats.resultPredictions,
          missPredictions: groupStats.missPredictions,
          accuracyPct: groupStats.accuracyPct,
          totalPoints: groupStats.totalPoints,
          averageMemberPoints: groupStats.averageMemberPoints,
          bestRound: groupStats.bestFecha || null,
          worstRound: groupStats.worstFecha || null,
          worldBenchmark: groupStats.worldBenchmark
        },
        awards: buildStatsAwards({
          rows: globalReferenceRows,
          periodSnapshots
        }),
        historicalSeries: buildHistoricalSeries({
          members: memberRows,
          periodSnapshots
        })
      };
    }

    const payload: LeaderboardPayload = {
      groupLabel: selectedMembership.group.name,
      mode,
      period,
      periodLabel: period === "global" ? "Global acumulado" : formatRoundLabel(String(period)),
      updatedAt: new Date().toISOString(),
      rows,
      groupStats,
      stats
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo construir la tabla de posiciones.";
    if (message.includes("PocketBase 403")) {
      return NextResponse.json(
        {
          error:
            "PocketBase rules are blocking group-wide leaderboard reads. Update predictions list/view rules to allow active group members to read group predictions."
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

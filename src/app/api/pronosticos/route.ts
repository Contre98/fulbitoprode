import { NextResponse } from "next/server";
import { pronosticosMatchesByPeriod } from "@/lib/mock-data";
import { clonePredictions, ensurePrediction, getPredictions, setPrediction } from "@/lib/prediction-store";
import { fetchLigaArgentinaFixtures, mapFixturesToPronosticosMatches } from "@/lib/liga-live-provider";
import type { MatchCardData, MatchPeriod, PredictionsByMatch, PredictionValue, PronosticosPayload } from "@/lib/types";

const periodLabels: Record<MatchPeriod, string> = {
  fecha14: "Fecha 14",
  fecha15: "Fecha 15"
};

function toPeriod(value: string | null): MatchPeriod {
  return value === "fecha15" ? "fecha15" : "fecha14";
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

function calculatePoints(prediction: { home: number; away: number }, score: { home: number; away: number }) {
  const isExact = prediction.home === score.home && prediction.away === score.away;
  if (isExact) {
    return 3;
  }

  const predictionDiff = Math.sign(prediction.home - prediction.away);
  const scoreDiff = Math.sign(score.home - score.away);
  return predictionDiff === scoreDiff ? 1 : 0;
}

async function getPeriodMatches(period: MatchPeriod) {
  const liveFixtures = await fetchLigaArgentinaFixtures(period);
  if (liveFixtures.length > 0) {
    return mapFixturesToPronosticosMatches(liveFixtures);
  }

  return copyMatches(pronosticosMatchesByPeriod[period]);
}

function ensurePeriodDefaults(period: MatchPeriod, source: MatchCardData[]) {
  const predictions = getPredictions(period);

  source.forEach((match) => {
    if (match.status === "upcoming" && !predictions[match.id]) {
      ensurePrediction(period, match.id, {
        home: match.prediction?.home ?? null,
        away: match.prediction?.away ?? null
      });
    }
  });
}

function withPredictions(matches: MatchCardData[], predictions: PredictionsByMatch) {
  return matches.map((match) => {
    const stored = predictions[match.id];
    const nextMatch: MatchCardData = { ...match };

    if (stored && (stored.home !== null || stored.away !== null)) {
      nextMatch.prediction = {
        home: stored.home ?? 0,
        away: stored.away ?? 0
      };
    }

    if (nextMatch.score && nextMatch.prediction) {
      const points = calculatePoints(nextMatch.prediction, nextMatch.score);
      nextMatch.points = {
        value: points,
        tone:
          nextMatch.status === "final"
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

async function buildPayload(period: MatchPeriod): Promise<PronosticosPayload> {
  const sourceMatches = await getPeriodMatches(period);
  ensurePeriodDefaults(period, sourceMatches);
  const matches = withPredictions(sourceMatches, getPredictions(period));

  return {
    period,
    periodLabel: periodLabels[period],
    matches,
    predictions: clonePredictions(period),
    updatedAt: new Date().toISOString()
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = toPeriod(searchParams.get("period"));

  return NextResponse.json(await buildPayload(period), { status: 200 });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      period?: MatchPeriod;
      matchId?: string;
      home?: number | null;
      away?: number | null;
    };

    const period = body.period === "fecha15" ? "fecha15" : "fecha14";
    const matchId = typeof body.matchId === "string" ? body.matchId : "";

    const matches = await getPeriodMatches(period);
    const match = matches.find((candidate) => candidate.id === matchId);
    if (!match || match.status !== "upcoming") {
      return NextResponse.json({ error: "Invalid upcoming match id." }, { status: 400 });
    }

    const home = typeof body.home === "number" ? Math.max(0, Math.min(99, body.home)) : null;
    const away = typeof body.away === "number" ? Math.max(0, Math.min(99, body.away)) : null;

    const nextValue: PredictionValue = { home, away };
    setPrediction(period, matchId, nextValue);

    return NextResponse.json({ ok: true, prediction: nextValue, updatedAt: new Date().toISOString() }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

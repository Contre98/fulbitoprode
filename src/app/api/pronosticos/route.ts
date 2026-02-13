import { NextResponse } from "next/server";
import { pronosticosMatchesByPeriod } from "@/lib/mock-data";
import type { MatchCardData, MatchPeriod, PredictionsByMatch, PredictionValue, PronosticosPayload } from "@/lib/types";

const periodLabels: Record<MatchPeriod, string> = {
  fecha14: "Fecha 14",
  fecha15: "Fecha 15"
};

const predictionStore: Record<MatchPeriod, PredictionsByMatch> = {
  fecha14: {},
  fecha15: {}
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

function ensurePeriodDefaults(period: MatchPeriod) {
  const source = pronosticosMatchesByPeriod[period];

  source.forEach((match) => {
    if (match.status === "upcoming" && !predictionStore[period][match.id]) {
      predictionStore[period][match.id] = {
        home: match.prediction?.home ?? null,
        away: match.prediction?.away ?? null
      };
    }
  });
}

function withPredictions(matches: MatchCardData[], predictions: PredictionsByMatch) {
  return matches.map((match) => {
    if (match.status !== "upcoming") {
      return match;
    }

    const stored = predictions[match.id];
    if (!stored || (stored.home === null && stored.away === null)) {
      return match;
    }

    return {
      ...match,
      prediction: {
        home: stored.home ?? 0,
        away: stored.away ?? 0
      }
    };
  });
}

function buildPayload(period: MatchPeriod): PronosticosPayload {
  ensurePeriodDefaults(period);

  const matches = withPredictions(copyMatches(pronosticosMatchesByPeriod[period]), predictionStore[period]);

  return {
    period,
    periodLabel: periodLabels[period],
    matches,
    predictions: predictionStore[period],
    updatedAt: new Date().toISOString()
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = toPeriod(searchParams.get("period"));

  return NextResponse.json(buildPayload(period), { status: 200 });
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

    const match = pronosticosMatchesByPeriod[period].find((candidate) => candidate.id === matchId);
    if (!match || match.status !== "upcoming") {
      return NextResponse.json({ error: "Invalid upcoming match id." }, { status: 400 });
    }

    const home = typeof body.home === "number" ? Math.max(0, Math.min(99, body.home)) : null;
    const away = typeof body.away === "number" ? Math.max(0, Math.min(99, body.away)) : null;

    const nextValue: PredictionValue = { home, away };
    predictionStore[period][matchId] = nextValue;

    return NextResponse.json({ ok: true, prediction: nextValue, updatedAt: new Date().toISOString() }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

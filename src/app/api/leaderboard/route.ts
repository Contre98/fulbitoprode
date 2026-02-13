import { NextResponse } from "next/server";
import { leaderboardRows } from "@/lib/mock-data";
import type { LeaderboardMode, LeaderboardPayload, LeaderboardPeriod, LeaderboardRow } from "@/lib/types";

const periodLabels: Record<LeaderboardPeriod, string> = {
  global: "Global acumulado",
  fecha14: "Fecha 14"
};

const deltaByIndex = [3, 1, 0, 3, 1, 0, 1, 0, 3, 1, 0, 3, 1, 0];

function toRankedRows(rows: LeaderboardRow[]): LeaderboardRow[] {
  return rows.map((row, index) => ({
    ...row,
    rank: index + 1,
    highlight: index === 0
  }));
}

function parseRecord(record: string) {
  const [exact, winDraw, miss] = record.split("/").map((value) => Number(value.trim()) || 0);
  return { exact, winDraw, miss };
}

function buildPosicionesRows(period: LeaderboardPeriod): LeaderboardRow[] {
  if (period === "global") {
    return toRankedRows(
      leaderboardRows.map((row) => ({
        ...row,
        highlight: false
      }))
    );
  }

  const adjusted = leaderboardRows
    .map((row, index) => ({
      ...row,
      points: row.points + deltaByIndex[index],
      highlight: false
    }))
    .sort((a, b) => b.points - a.points || b.predictions - a.predictions || a.name.localeCompare(b.name));

  return toRankedRows(adjusted);
}

function buildStatsRows(period: LeaderboardPeriod): LeaderboardRow[] {
  const source = buildPosicionesRows(period);

  const stats = source
    .map((row) => {
      const parsed = parseRecord(row.record);
      const total = parsed.exact + parsed.winDraw + parsed.miss || 1;
      const efficiency = Math.round(((parsed.exact * 3 + parsed.winDraw) / (total * 3)) * 100);

      return {
        ...row,
        predictions: parsed.exact,
        points: efficiency,
        highlight: false
      };
    })
    .sort((a, b) => b.points - a.points || b.predictions - a.predictions || a.name.localeCompare(b.name));

  return toRankedRows(stats);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const modeParam = searchParams.get("mode");
  const periodParam = searchParams.get("period");

  const mode: LeaderboardMode = modeParam === "stats" ? "stats" : "posiciones";
  const period: LeaderboardPeriod = periodParam === "fecha14" ? "fecha14" : "global";

  const rows = mode === "stats" ? buildStatsRows(period) : buildPosicionesRows(period);

  const payload: LeaderboardPayload = {
    groupLabel: "Liga amigos | Grupo A",
    mode,
    period,
    periodLabel: periodLabels[period],
    updatedAt: new Date().toISOString(),
    rows
  };

  return NextResponse.json(payload, { status: 200 });
}

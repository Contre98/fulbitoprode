import { NextResponse } from "next/server";
import { fixtureDateCardsByPeriod } from "@/lib/mock-data";
import { fetchLigaArgentinaFixtures, mapFixturesToFixtureCards } from "@/lib/liga-live-provider";
import type { FixturePayload, MatchPeriod } from "@/lib/types";

const periodLabels: Record<MatchPeriod, string> = {
  fecha14: "Fecha 14",
  fecha15: "Fecha 15"
};

function toPeriod(value: string | null): MatchPeriod {
  return value === "fecha15" ? "fecha15" : "fecha14";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = toPeriod(searchParams.get("period"));
  const liveFixtures = await fetchLigaArgentinaFixtures(period);
  const cards = liveFixtures.length > 0 ? mapFixturesToFixtureCards(liveFixtures) : fixtureDateCardsByPeriod[period];

  const payload: FixturePayload = {
    period,
    periodLabel: periodLabels[period],
    cards,
    updatedAt: new Date().toISOString()
  };

  return NextResponse.json(payload, { status: 200 });
}

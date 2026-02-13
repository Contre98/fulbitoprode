import { NextResponse } from "next/server";
import { probeLigaArgentinaProvider } from "@/lib/liga-live-provider";
import type { MatchPeriod } from "@/lib/types";

function parsePeriod(value: string | null): MatchPeriod {
  return value === "fecha15" ? "fecha15" : "fecha14";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = parsePeriod(searchParams.get("period"));

  const report = await probeLigaArgentinaProvider(period);

  return NextResponse.json(
    {
      provider: "api-football",
      timestamp: new Date().toISOString(),
      ...report
    },
    { status: report.configured && report.ok ? 200 : 503 }
  );
}

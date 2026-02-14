import { NextResponse } from "next/server";
import { fetchProviderLeagues } from "@/lib/liga-live-provider";
import { getSessionPocketBaseTokenFromRequest, getSessionUserIdFromRequest } from "@/lib/request-auth";
import type { LeaguesPayload } from "@/lib/types";

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  const pbToken = getSessionPocketBaseTokenFromRequest(request);
  if (!userId || !pbToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const season = searchParams.get("season")?.trim() || undefined;

  const leagues = await fetchProviderLeagues({ season });
  const payload: LeaguesPayload = {
    leagues,
    updatedAt: new Date().toISOString()
  };

  return NextResponse.json(payload, { status: 200 });
}

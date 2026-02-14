import { NextResponse } from "next/server";
import { joinGroupByCodeOrToken } from "@/lib/m3-repo";
import { getSessionPocketBaseTokenFromRequest, getSessionUserIdFromRequest } from "@/lib/request-auth";

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  const pbToken = getSessionPocketBaseTokenFromRequest(request);
  if (!userId || !pbToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { codeOrToken?: string };
    const codeOrToken = body.codeOrToken?.trim() || "";

    if (!codeOrToken) {
      return NextResponse.json({ error: "codeOrToken is required" }, { status: 400 });
    }

    const joined = await joinGroupByCodeOrToken({ userId, codeOrToken }, pbToken);
    if (!joined.ok) {
      return NextResponse.json({ error: joined.error }, { status: 400 });
    }

    return NextResponse.json(
      {
        ok: true,
        group: {
          id: joined.group.id,
          name: joined.group.name,
          slug: joined.group.slug,
          season: joined.group.season,
          leagueId: joined.group.leagueId
        }
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

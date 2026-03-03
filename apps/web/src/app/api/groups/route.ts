import { NextResponse } from "next/server";
import { createGroup, listGroupsForUser } from "@/lib/m3-repo";
import { getSessionPocketBaseTokenFromRequest, getSessionUserIdFromRequest } from "@/lib/request-auth";

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  const pbToken = getSessionPocketBaseTokenFromRequest(request);
  if (!userId || !pbToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const groups = (await listGroupsForUser(userId, pbToken)).map(({ group, membership }) => ({
    id: group.id,
    name: group.name,
    slug: group.slug,
    role: membership.role,
    season: group.season,
    leagueId: group.leagueId,
    competitionStage: group.competitionStage,
    competitionName: group.competitionName,
    competitionKey: group.competitionKey,
    joinedAt: membership.joinedAt
  }));

  return NextResponse.json({ groups }, { status: 200 });
}

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  const pbToken = getSessionPocketBaseTokenFromRequest(request);
  if (!userId || !pbToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      season?: string;
      leagueId?: number;
      competitionStage?: "apertura" | "clausura" | "general";
      competitionName?: string;
      competitionKey?: string;
    };

    const name = body.name?.trim() || "";
    if (!name) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 });
    }

    const created = await createGroup({
      userId,
      name,
      season: body.season?.trim() || undefined,
      leagueId: typeof body.leagueId === "number" ? body.leagueId : undefined,
      competitionStage: body.competitionStage,
      competitionName: body.competitionName?.trim() || undefined,
      competitionKey: body.competitionKey?.trim() || undefined
    }, pbToken);

    return NextResponse.json(
      {
        group: {
          id: created.group.id,
          name: created.group.name,
          slug: created.group.slug,
          role: created.membership.role,
          season: created.group.season,
          leagueId: created.group.leagueId,
          competitionStage: created.group.competitionStage,
          competitionName: created.group.competitionName,
          competitionKey: created.group.competitionKey
        },
        invite: {
          code: created.invite.code,
          token: created.invite.token,
          expiresAt: new Date(created.invite.expiresAt).toISOString()
        }
      },
      { status: 201 }
    );
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      const message = error instanceof Error ? error.message : "Invalid payload";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

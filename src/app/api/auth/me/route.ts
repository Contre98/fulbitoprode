import { NextResponse } from "next/server";
import { getUserById, listGroupsForUser, updateUserProfile } from "@/lib/m3-repo";
import { fetchProviderLeagues } from "@/lib/liga-live-provider";
import { getSessionPocketBaseTokenFromRequest, getSessionUserIdFromRequest } from "@/lib/request-auth";

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  const pbToken = getSessionPocketBaseTokenFromRequest(request);
  if (!userId || !pbToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getUserById(userId, pbToken);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const groupMemberships = await listGroupsForUser(user.id, pbToken);
  const seasons = [...new Set(groupMemberships.map((row) => row.group.season))];
  const leagueMap = new Map<string, string>();
  await Promise.all(
    seasons.map(async (season) => {
      const leagues = await fetchProviderLeagues({ season });
      leagues.forEach((league) => {
        if (!leagueMap.has(league.competitionKey)) {
          leagueMap.set(league.competitionKey, league.name);
        }
      });
    })
  );

  const memberships = groupMemberships.map(({ group, membership }) => ({
    groupId: group.id,
    groupName: group.name,
    role: membership.role,
    joinedAt: membership.joinedAt,
    leagueId: group.leagueId,
    season: group.season,
    leagueName:
      leagueMap.get(group.competitionKey) ||
      (group.competitionName ? `Liga Profesional ${group.competitionName}` : `Liga ${group.leagueId}`),
    competitionKey: group.competitionKey,
    competitionName: group.competitionName,
    competitionStage: group.competitionStage
  }));

  return NextResponse.json(
    {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username ?? null,
        favoriteTeam: user.favoriteTeam ?? null
      },
      memberships
    },
    { status: 200 }
  );
}

export async function PATCH(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  const pbToken = getSessionPocketBaseTokenFromRequest(request);
  if (!userId || !pbToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      name?: string | null;
      username?: string | null;
      email?: string | null;
      favoriteTeam?: string | null;
    };

    const nextName = typeof body.name === "string" || body.name === null ? body.name : undefined;
    const nextUsername = typeof body.username === "string" || body.username === null ? body.username : undefined;
    const nextEmail = typeof body.email === "string" || body.email === null ? body.email : undefined;
    const nextFavoriteTeam =
      typeof body.favoriteTeam === "string" || body.favoriteTeam === null ? body.favoriteTeam : undefined;
    let normalizedUsername: string | undefined;
    let normalizedEmail: string | undefined;

    if (nextName !== undefined && nextName !== null && nextName.trim().length > 120) {
      return NextResponse.json({ error: "Name is too long" }, { status: 400 });
    }

    if (nextUsername === null) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    if (nextUsername !== undefined) {
      normalizedUsername = nextUsername.trim().replace(/^@+/, "");
      if (!normalizedUsername) {
        return NextResponse.json({ error: "Username is required" }, { status: 400 });
      }
      if (normalizedUsername.length > 40) {
        return NextResponse.json({ error: "Username is too long" }, { status: 400 });
      }
      if (!USERNAME_PATTERN.test(normalizedUsername)) {
        return NextResponse.json(
          { error: "Username can only include letters, numbers, dot, underscore and dash" },
          { status: 400 }
        );
      }
    }

    if (nextEmail === null) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (nextEmail !== undefined) {
      normalizedEmail = nextEmail.trim().toLowerCase();
      if (!normalizedEmail) {
        return NextResponse.json({ error: "Email is required" }, { status: 400 });
      }
      if (normalizedEmail.length > 190) {
        return NextResponse.json({ error: "Email is too long" }, { status: 400 });
      }
      if (!EMAIL_PATTERN.test(normalizedEmail)) {
        return NextResponse.json({ error: "Email is invalid" }, { status: 400 });
      }
    }

    if (nextFavoriteTeam !== undefined && nextFavoriteTeam !== null && nextFavoriteTeam.trim().length > 120) {
      return NextResponse.json({ error: "Favorite team is too long" }, { status: 400 });
    }

    const updated = await updateUserProfile(
      userId,
      {
        name: nextName,
        username: normalizedUsername,
        email: normalizedEmail,
        favoriteTeam: nextFavoriteTeam
      },
      pbToken
    );

    return NextResponse.json(
      {
        ok: true,
        user: {
          id: updated.id,
          email: updated.email,
          name: updated.name,
          username: updated.username ?? null,
          favoriteTeam: updated.favoriteTeam ?? null
        }
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

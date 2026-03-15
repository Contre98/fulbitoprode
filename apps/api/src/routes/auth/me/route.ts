import { z } from "zod";
import { jsonResponse } from "#http";
import { deleteUserAccount, getUserById, listGroupsForUser, updateUserPassword, updateUserProfile } from "@fulbito/server-core/m3-repo";
import { fetchProviderLeagues } from "@fulbito/server-core/liga-live-provider";
import { getSessionPocketBaseTokenFromRequest, getSessionUserIdFromRequest } from "@fulbito/server-core/request-auth";
import type { Membership, User } from "@fulbito/domain";
import { parseJsonBody, RequestBodyValidationError } from "../../../validation";

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const updateProfilePayloadSchema = z.object({
  name: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  favoriteTeam: z.string().nullable().optional()
});
const changePasswordPayloadSchema = z.object({
  password: z.string().optional(),
  oldPassword: z.string().nullable().optional()
});
const LPF_APERTURA_2026_LABEL = "LPF: Apertura (2026)";

function membershipLeagueName(input: { competitionStage?: "apertura" | "clausura" | "general"; competitionName?: string; leagueId: number }) {
  if (input.competitionStage === "apertura") {
    return LPF_APERTURA_2026_LABEL;
  }
  if (input.competitionName) {
    return input.competitionName;
  }
  return `Liga ${input.leagueId}`;
}

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  const pbToken = getSessionPocketBaseTokenFromRequest(request);
  if (!userId || !pbToken) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getUserById(userId, pbToken);
  if (!user) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
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

  const memberships: Membership[] = groupMemberships.map(({ group, membership }) => ({
    groupId: group.id,
    groupName: group.name,
    role: membership.role,
    joinedAt: membership.joinedAt,
    leagueId: group.leagueId,
    season: group.season,
    leagueName: leagueMap.get(group.competitionKey) || membershipLeagueName(group),
    competitionKey: group.competitionKey,
    competitionName: group.competitionName,
    competitionStage: group.competitionStage
  }));

  const responseUser: User = {
    id: user.id,
    email: user.email,
    name: user.name,
    username: user.username ?? null,
    favoriteTeam: user.favoriteTeam ?? null
  };

  return jsonResponse({ user: responseUser, memberships }, { status: 200 });
}

export async function PATCH(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  const pbToken = getSessionPocketBaseTokenFromRequest(request);
  if (!userId || !pbToken) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await parseJsonBody(request, updateProfilePayloadSchema);

    const nextName = typeof body.name === "string" || body.name === null ? body.name : undefined;
    const nextUsername = typeof body.username === "string" || body.username === null ? body.username : undefined;
    const nextEmail = typeof body.email === "string" || body.email === null ? body.email : undefined;
    const nextFavoriteTeam =
      typeof body.favoriteTeam === "string" || body.favoriteTeam === null ? body.favoriteTeam : undefined;
    let normalizedUsername: string | undefined;
    let normalizedEmail: string | undefined;

    if (nextName !== undefined && nextName !== null && nextName.trim().length > 120) {
      return jsonResponse({ error: "Name is too long" }, { status: 400 });
    }

    if (nextUsername === null) {
      return jsonResponse({ error: "Username is required" }, { status: 400 });
    }

    if (nextUsername !== undefined) {
      normalizedUsername = nextUsername.trim().replace(/^@+/, "");
      if (!normalizedUsername) {
        return jsonResponse({ error: "Username is required" }, { status: 400 });
      }
      if (normalizedUsername.length > 40) {
        return jsonResponse({ error: "Username is too long" }, { status: 400 });
      }
      if (!USERNAME_PATTERN.test(normalizedUsername)) {
        return jsonResponse(
          { error: "Username can only include letters, numbers, dot, underscore and dash" },
          { status: 400 }
        );
      }
    }

    if (nextEmail === null) {
      return jsonResponse({ error: "Email is required" }, { status: 400 });
    }

    if (nextEmail !== undefined) {
      normalizedEmail = nextEmail.trim().toLowerCase();
      if (!normalizedEmail) {
        return jsonResponse({ error: "Email is required" }, { status: 400 });
      }
      if (normalizedEmail.length > 190) {
        return jsonResponse({ error: "Email is too long" }, { status: 400 });
      }
      if (!EMAIL_PATTERN.test(normalizedEmail)) {
        return jsonResponse({ error: "Email is invalid" }, { status: 400 });
      }
    }

    if (nextFavoriteTeam !== undefined && nextFavoriteTeam !== null && nextFavoriteTeam.trim().length > 120) {
      return jsonResponse({ error: "Favorite team is too long" }, { status: 400 });
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

    return jsonResponse(
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
  } catch (error) {
    if (error instanceof RequestBodyValidationError) {
      return jsonResponse({ error: error.message }, { status: error.status });
    }
    return jsonResponse({ error: "Invalid payload" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  const pbToken = getSessionPocketBaseTokenFromRequest(request);
  if (!userId || !pbToken) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await parseJsonBody(request, changePasswordPayloadSchema);
    const nextPassword = body.password?.trim() || "";
    const oldPassword = body.oldPassword?.trim() || undefined;

    if (!nextPassword) {
      return jsonResponse({ error: "Password is required" }, { status: 400 });
    }
    if (nextPassword.length < MIN_PASSWORD_LENGTH) {
      return jsonResponse({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    await updateUserPassword(
      userId,
      {
        password: nextPassword,
        oldPassword
      },
      pbToken
    );

    return jsonResponse({ ok: true }, { status: 200 });
  } catch (error) {
    if (error instanceof RequestBodyValidationError) {
      return jsonResponse({ error: error.message }, { status: error.status });
    }
    if (error instanceof Error && error.message.trim().length > 0) {
      return jsonResponse({ error: error.message }, { status: 400 });
    }
    return jsonResponse({ error: "Invalid payload" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  const pbToken = getSessionPocketBaseTokenFromRequest(request);
  if (!userId || !pbToken) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await deleteUserAccount(userId, pbToken);
    return jsonResponse({ ok: true }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message.trim().length > 0) {
      return jsonResponse({ error: error.message }, { status: 400 });
    }
    return jsonResponse({ error: "Could not delete account" }, { status: 400 });
  }
}

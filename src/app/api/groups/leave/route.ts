import { NextResponse } from "next/server";
import { leaveGroup } from "@/lib/m3-repo";
import { getSessionPocketBaseTokenFromRequest, getSessionUserIdFromRequest } from "@/lib/request-auth";

function extractRouteError(error: unknown) {
  if (!(error instanceof Error)) {
    return { status: 500, message: "No se pudo abandonar el grupo." };
  }

  const raw = error.message;
  const match = raw.match(/^PocketBase (\d{3}):\s*([\s\S]*)$/);
  if (!match) {
    return { status: 500, message: raw || "No se pudo abandonar el grupo." };
  }

  const status = Number(match[1]) || 500;
  const body = match[2] || "";
  try {
    const parsed = JSON.parse(body) as {
      message?: string;
      data?: Record<string, { message?: string }>;
    };
    const dataMessages = parsed.data
      ? Object.entries(parsed.data)
          .map(([field, value]) => {
            const message = value?.message?.trim();
            return message ? `${field}: ${message}` : null;
          })
          .filter((value): value is string => Boolean(value))
      : [];
    const firstDataMessage = dataMessages[0] || null;
    const normalizedMessage = (parsed.message || "").trim().toLowerCase();
    const isGenericPbMessage =
      normalizedMessage === "something went wrong while processing your request." ||
      normalizedMessage === "something went wrong while processing your request";
    return {
      status,
      message:
        firstDataMessage ||
        (isGenericPbMessage
          ? "PocketBase rechazó la operación. Revisá reglas API y validaciones de groups/group_members/group_invites."
          : parsed.message || raw)
    };
  } catch {
    return { status, message: body || raw };
  }
}

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  const pbToken = getSessionPocketBaseTokenFromRequest(request);
  if (!userId || !pbToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { groupId?: string };
  try {
    body = (await request.json()) as { groupId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const groupId = body.groupId?.trim() || "";
  if (!groupId) {
    return NextResponse.json({ error: "groupId is required" }, { status: 400 });
  }

  try {
    const result = await leaveGroup({ userId, groupId }, pbToken);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, deletedGroup: result.deletedGroup ?? false }, { status: 200 });
  } catch (error) {
    const parsed = extractRouteError(error);
    return NextResponse.json({ error: parsed.message }, { status: parsed.status });
  }
}

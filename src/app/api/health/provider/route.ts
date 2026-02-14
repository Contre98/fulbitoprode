import { NextResponse } from "next/server";
import { probeLigaArgentinaProvider } from "@/lib/liga-live-provider";
import { getHealthcheckToken } from "@/lib/env";
import { listGroupsForUser } from "@/lib/m3-repo";
import { getSessionPocketBaseTokenFromRequest, getSessionUserIdFromRequest } from "@/lib/request-auth";
import type { MatchPeriod } from "@/lib/types";

function parsePeriod(value: string | null): MatchPeriod {
  return value?.trim() || "fecha14";
}

export async function GET(request: Request) {
  const configuredHealthToken = getHealthcheckToken();
  const requestHealthToken = request.headers.get("x-healthcheck-token")?.trim() || "";
  const hasHealthTokenAccess = Boolean(
    configuredHealthToken && requestHealthToken && requestHealthToken === configuredHealthToken
  );

  if (!hasHealthTokenAccess) {
    const userId = getSessionUserIdFromRequest(request);
    const pbToken = getSessionPocketBaseTokenFromRequest(request);
    if (!userId || !pbToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberships = await listGroupsForUser(userId, pbToken);
    const hasAdminAccess = memberships.some(
      (membership) => membership.membership.role === "owner" || membership.membership.role === "admin"
    );
    if (!hasAdminAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

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

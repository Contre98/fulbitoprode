import { NextResponse } from "next/server";
import { probeLigaArgentinaProvider } from "@/lib/liga-live-provider";
import { getHealthcheckToken } from "@/lib/env";
import { listGroupsForUser } from "@/lib/m3-repo";
import { getSessionPocketBaseTokenFromRequest, getSessionUserIdFromRequest } from "@/lib/request-auth";
import type { MatchPeriod } from "@/lib/types";

const HEALTH_REPORT_TTL_MS = 180_000;
const ADMIN_ACCESS_TTL_MS = 300_000;
const healthReportCache = new Map<string, { expiresAt: number; status: number; payload: Record<string, unknown> }>();
const adminAccessCache = new Map<string, { expiresAt: number; allowed: boolean }>();

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

    const now = Date.now();
    let hasAdminAccess = false;
    const cachedAdminAccess = adminAccessCache.get(userId);
    if (cachedAdminAccess && cachedAdminAccess.expiresAt > now) {
      hasAdminAccess = cachedAdminAccess.allowed;
    } else {
      const memberships = await listGroupsForUser(userId, pbToken);
      hasAdminAccess = memberships.some(
        (membership) => membership.membership.role === "owner" || membership.membership.role === "admin"
      );
      adminAccessCache.set(userId, {
        expiresAt: now + ADMIN_ACCESS_TTL_MS,
        allowed: hasAdminAccess
      });
    }

    if (!hasAdminAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { searchParams } = new URL(request.url);
  const period = parsePeriod(searchParams.get("period"));
  const cacheKey = `period:${period}`;
  const now = Date.now();
  const cachedReport = healthReportCache.get(cacheKey);
  if (cachedReport && cachedReport.expiresAt > now) {
    return NextResponse.json(cachedReport.payload, { status: cachedReport.status });
  }

  const report = await probeLigaArgentinaProvider(period);
  const payload = {
    provider: "api-football",
    timestamp: new Date().toISOString(),
    ...report
  };
  const status = report.configured && report.ok ? 200 : 503;

  healthReportCache.set(cacheKey, {
    expiresAt: now + HEALTH_REPORT_TTL_MS,
    payload,
    status
  });

  return NextResponse.json(payload, { status });
}

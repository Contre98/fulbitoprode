import { jsonResponse } from "#http";
import { probeLigaArgentinaProvider } from "@fulbito/server-core/liga-live-provider";
import { getHealthcheckToken } from "@fulbito/server-core/env";
import { listGroupsForUser } from "@fulbito/server-core/m3-repo";
import { getSessionPocketBaseTokenFromRequest, getSessionUserIdFromRequest } from "@fulbito/server-core/request-auth";
const HEALTH_REPORT_TTL_MS = 180_000;
const ADMIN_ACCESS_TTL_MS = 300_000;
const healthReportCache = new Map();
const adminAccessCache = new Map();
function parsePeriod(value) {
    return value?.trim() || "fecha14";
}
export async function GET(request) {
    const configuredHealthToken = getHealthcheckToken();
    const requestHealthToken = request.headers.get("x-healthcheck-token")?.trim() || "";
    const hasHealthTokenAccess = Boolean(configuredHealthToken && requestHealthToken && requestHealthToken === configuredHealthToken);
    if (!hasHealthTokenAccess) {
        const userId = getSessionUserIdFromRequest(request);
        const pbToken = getSessionPocketBaseTokenFromRequest(request);
        if (!userId || !pbToken) {
            return jsonResponse({ error: "Unauthorized" }, { status: 401 });
        }
        const now = Date.now();
        let hasAdminAccess = false;
        const cachedAdminAccess = adminAccessCache.get(userId);
        if (cachedAdminAccess && cachedAdminAccess.expiresAt > now) {
            hasAdminAccess = cachedAdminAccess.allowed;
        }
        else {
            const memberships = await listGroupsForUser(userId, pbToken);
            hasAdminAccess = memberships.some((membership) => membership.membership.role === "owner" || membership.membership.role === "admin");
            adminAccessCache.set(userId, {
                expiresAt: now + ADMIN_ACCESS_TTL_MS,
                allowed: hasAdminAccess
            });
        }
        if (!hasAdminAccess) {
            return jsonResponse({ error: "Forbidden" }, { status: 403 });
        }
    }
    const { searchParams } = new URL(request.url);
    const period = parsePeriod(searchParams.get("period"));
    const cacheKey = `period:${period}`;
    const now = Date.now();
    const cachedReport = healthReportCache.get(cacheKey);
    if (cachedReport && cachedReport.expiresAt > now) {
        return jsonResponse(cachedReport.payload, { status: cachedReport.status });
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
    return jsonResponse(payload, { status });
}

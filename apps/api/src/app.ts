import { Hono } from "hono";
import { jsonResponse } from "#http";

import * as authForgotPasswordRoute from "./routes/auth/forgot-password/route";
import * as authLoginPasswordRoute from "./routes/auth/login-password/route";
import * as authLogoutRoute from "./routes/auth/logout/route";
import * as authMeRoute from "./routes/auth/me/route";
import * as authRegisterPasswordRoute from "./routes/auth/register-password/route";
import * as authRefreshRoute from "./routes/auth/refresh/route";
import * as fechasRoute from "./routes/fechas/route";
import * as fixtureRoute from "./routes/fixture/route";
import * as groupsRoute from "./routes/groups/route";
import * as groupsJoinRoute from "./routes/groups/join/route";
import * as groupsLeaveRoute from "./routes/groups/leave/route";
import * as groupsGroupIdRoute from "./routes/groups/[groupId]/route";
import * as groupsGroupIdMembersRoute from "./routes/groups/[groupId]/members/route";
import * as groupsGroupIdInviteRoute from "./routes/groups/[groupId]/invite/route";
import * as groupsGroupIdInviteRefreshRoute from "./routes/groups/[groupId]/invite/refresh/route";
import * as adminNotificationsDryRunRoute from "./routes/admin/notifications/manual/dry-run/route";
import * as adminNotificationsSendRoute from "./routes/admin/notifications/manual/send/route";
import * as adminNotificationsReplayRoute from "./routes/admin/notifications/manual/replay/route";
import * as adminNotificationsTriggerRunRoute from "./routes/admin/notifications/triggers/[event]/run/route";
import * as adminNotificationsJobRoute from "./routes/admin/notifications/jobs/[jobId]/route";
import * as healthPocketbaseRoute from "./routes/health/pocketbase/route";
import * as healthProviderRoute from "./routes/health/provider/route";
import * as homeRoute from "./routes/home/route";
import * as leaderboardRoute from "./routes/leaderboard/route";
import * as leaguesRoute from "./routes/leagues/route";
import * as notificationsDeviceTokenRoute from "./routes/notifications/device-token/route";
import * as notificationsDispatchRoute from "./routes/notifications/dispatch/route";
import * as notificationsInboxRoute from "./routes/notifications/inbox/route";
import * as notificationsPreferencesRoute from "./routes/notifications/preferences/route";
import * as joinRoute from "./routes/join/route";
import * as profileRoute from "./routes/profile/route";
import * as pronosticosRoute from "./routes/pronosticos/route";
import { mapApiError } from "./error-mapper";
import type { ApiRateLimitContext } from "./request-context";
import { getRequestContext, initializeRequestContext, logRequestCompletion, setRateLimitContext } from "./request-context";

type GenericRouteModule = {
  GET?: (...args: any[]) => Promise<Response | undefined> | Response | undefined;
  POST?: (...args: any[]) => Promise<Response | undefined> | Response | undefined;
  PATCH?: (...args: any[]) => Promise<Response | undefined> | Response | undefined;
  PUT?: (...args: any[]) => Promise<Response | undefined> | Response | undefined;
  DELETE?: (...args: any[]) => Promise<Response | undefined> | Response | undefined;
};

const app = new Hono();

app.use("*", async (c, next) => {
  const requestContext = initializeRequestContext(c);
  c.header("x-request-id", requestContext.requestId);
  c.header("x-trace-id", requestContext.traceId);
  c.header("x-powered-by", "fulbito-api");

  let caughtError: unknown;
  try {
    await next();
  } catch (error) {
    caughtError = error;
  } finally {
    const durationMs = Date.now() - requestContext.startedAtMs;
    c.header("x-response-time", `${durationMs}ms`);
    const statusFromError =
      typeof caughtError === "object" &&
      caughtError !== null &&
      "status" in caughtError &&
      Number.isFinite(Number((caughtError as { status?: unknown }).status))
        ? Number((caughtError as { status?: unknown }).status)
        : 500;
    logRequestCompletion({
      context: requestContext,
      status: caughtError ? statusFromError : c.res.status,
      durationMs,
      error: caughtError
    });
  }
  if (caughtError) {
    throw caughtError;
  }
});

function registerRoute(path: string, routeModule: GenericRouteModule) {
  const invoke =
    (handler: (...args: any[]) => Promise<Response | undefined> | Response | undefined) => async (c: any) => {
      const params = c.req.param();
      const response = await handler(c.req.raw, {
        params: Promise.resolve(params),
        requestContext: getRequestContext(c),
        setRateLimitContext: (rateLimit: ApiRateLimitContext) => {
          setRateLimitContext(c, rateLimit);
        }
      });
      if (!response) {
        return jsonResponse(
          {
            error: "Handler returned no response",
            requestId: getRequestContext(c).requestId
          },
          { status: 500 }
        );
      }
      return response;
    };

  if (routeModule.GET) app.get(path, invoke(routeModule.GET));
  if (routeModule.POST) app.post(path, invoke(routeModule.POST));
  if (routeModule.PATCH) app.patch(path, invoke(routeModule.PATCH));
  if (routeModule.PUT) app.put(path, invoke(routeModule.PUT));
  if (routeModule.DELETE) app.delete(path, invoke(routeModule.DELETE));
}

app.onError((error, c) => {
  return mapApiError(error, c);
});

app.notFound((c) => {
  const requestContext = getRequestContext(c);
  const durationMs = Date.now() - requestContext.startedAtMs;
  return jsonResponse(
    {
      error: "Not Found",
      requestId: requestContext.requestId
    },
    {
      status: 404,
      headers: {
        "x-request-id": requestContext.requestId,
        "x-trace-id": requestContext.traceId,
        "x-powered-by": "fulbito-api",
        "x-response-time": `${durationMs}ms`
      }
    }
  );
});

registerRoute("/api/auth/forgot-password", authForgotPasswordRoute);
registerRoute("/api/auth/login-password", authLoginPasswordRoute);
registerRoute("/api/auth/logout", authLogoutRoute);
registerRoute("/api/auth/me", authMeRoute);
registerRoute("/api/auth/register-password", authRegisterPasswordRoute);
registerRoute("/api/auth/refresh", authRefreshRoute);
registerRoute("/api/fechas", fechasRoute);
registerRoute("/api/fixture", fixtureRoute);
registerRoute("/api/groups", groupsRoute);
registerRoute("/api/groups/join", groupsJoinRoute);
registerRoute("/api/groups/leave", groupsLeaveRoute);
registerRoute("/api/groups/:groupId", groupsGroupIdRoute);
registerRoute("/api/groups/:groupId/members", groupsGroupIdMembersRoute);
registerRoute("/api/groups/:groupId/invite", groupsGroupIdInviteRoute);
registerRoute("/api/groups/:groupId/invite/refresh", groupsGroupIdInviteRefreshRoute);
registerRoute("/api/health/pocketbase", healthPocketbaseRoute);
registerRoute("/api/health/provider", healthProviderRoute);
registerRoute("/api/home", homeRoute);
registerRoute("/api/leaderboard", leaderboardRoute);
registerRoute("/api/leagues", leaguesRoute);
registerRoute("/api/notifications/device-token", notificationsDeviceTokenRoute);
registerRoute("/api/notifications/dispatch", notificationsDispatchRoute);
registerRoute("/api/notifications/inbox", notificationsInboxRoute);
registerRoute("/api/notifications/preferences", notificationsPreferencesRoute);
registerRoute("/join", joinRoute);
registerRoute("/api/profile", profileRoute);
registerRoute("/api/pronosticos", pronosticosRoute);
registerRoute("/api/admin/notifications/manual/dry-run", adminNotificationsDryRunRoute);
registerRoute("/api/admin/notifications/manual/send", adminNotificationsSendRoute);
registerRoute("/api/admin/notifications/manual/replay", adminNotificationsReplayRoute);
registerRoute("/api/admin/notifications/triggers/:event/run", adminNotificationsTriggerRunRoute);
registerRoute("/api/admin/notifications/jobs/:jobId", adminNotificationsJobRoute);

export { app };

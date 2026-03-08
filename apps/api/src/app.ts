import { Hono } from "hono";
import { randomUUID } from "node:crypto";

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
import * as healthPocketbaseRoute from "./routes/health/pocketbase/route";
import * as healthProviderRoute from "./routes/health/provider/route";
import * as homeRoute from "./routes/home/route";
import * as leaderboardRoute from "./routes/leaderboard/route";
import * as leaguesRoute from "./routes/leagues/route";
import * as notificationsDeviceTokenRoute from "./routes/notifications/device-token/route";
import * as notificationsDispatchRoute from "./routes/notifications/dispatch/route";
import * as notificationsInboxRoute from "./routes/notifications/inbox/route";
import * as notificationsPreferencesRoute from "./routes/notifications/preferences/route";
import * as profileRoute from "./routes/profile/route";
import * as pronosticosRoute from "./routes/pronosticos/route";

type GenericRouteModule = {
  GET?: (...args: any[]) => Promise<Response | undefined> | Response | undefined;
  POST?: (...args: any[]) => Promise<Response | undefined> | Response | undefined;
  PATCH?: (...args: any[]) => Promise<Response | undefined> | Response | undefined;
  PUT?: (...args: any[]) => Promise<Response | undefined> | Response | undefined;
  DELETE?: (...args: any[]) => Promise<Response | undefined> | Response | undefined;
};

const app = new Hono();

app.use("*", async (c, next) => {
  const startedAt = Date.now();
  const requestId = randomUUID();
  c.header("x-request-id", requestId);
  c.header("x-powered-by", "fulbito-api");

  await next();

  const durationMs = Date.now() - startedAt;
  c.header("x-response-time", `${durationMs}ms`);
});

function registerRoute(path: string, routeModule: GenericRouteModule) {
  const invoke =
    (handler: (...args: any[]) => Promise<Response | undefined> | Response | undefined) => async (c: any) => {
      const params = c.req.param();
      const response = await handler(c.req.raw, { params: Promise.resolve(params) });
      if (!response) {
        return new Response(JSON.stringify({ error: "Handler returned no response" }), {
          status: 500,
          headers: { "content-type": "application/json; charset=utf-8" }
        });
      }
      return response;
    };

  if (routeModule.GET) app.get(path, invoke(routeModule.GET));
  if (routeModule.POST) app.post(path, invoke(routeModule.POST));
  if (routeModule.PATCH) app.patch(path, invoke(routeModule.PATCH));
  if (routeModule.PUT) app.put(path, invoke(routeModule.PUT));
  if (routeModule.DELETE) app.delete(path, invoke(routeModule.DELETE));
}

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
registerRoute("/api/profile", profileRoute);
registerRoute("/api/pronosticos", pronosticosRoute);

export { app };

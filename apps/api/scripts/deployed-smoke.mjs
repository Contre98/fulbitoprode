#!/usr/bin/env node

const startedAt = Date.now();

class SmokeFailure extends Error {
  constructor(message) {
    super(message);
    this.name = "SmokeFailure";
  }
}

function readEnv(name, options = {}) {
  const value = process.env[name]?.trim();
  if (!value && options.required) {
    throw new SmokeFailure(`Missing required env var: ${name}`);
  }
  return value || "";
}

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, "");
}

function logStep(step, message) {
  const ts = new Date().toISOString();
  console.log(`[smoke][${ts}] [${step}] ${message}`);
}

function ensure(condition, message) {
  if (!condition) {
    throw new SmokeFailure(message);
  }
}

async function requestJson(input) {
  const headers = new Headers(input.headers || {});
  if (input.token) {
    headers.set("authorization", `Bearer ${input.token}`);
  }
  if (input.body !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(input.url, {
    method: input.method || "GET",
    headers,
    body: input.body !== undefined ? JSON.stringify(input.body) : undefined
  });

  let payload = null;
  const rawText = await response.text();
  if (rawText.trim().length > 0) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = rawText;
    }
  }

  return {
    status: response.status,
    payload
  };
}

function pickGroup(groups, targetGroupId) {
  if (!Array.isArray(groups)) {
    return null;
  }

  if (targetGroupId) {
    return groups.find((group) => group && group.id === targetGroupId) || null;
  }

  return groups[0] || null;
}

async function main() {
  const baseUrlRaw = readEnv("FULBITO_API_BASE_URL") || readEnv("API_BASE_URL");
  if (!baseUrlRaw) {
    throw new SmokeFailure("Missing required env var: FULBITO_API_BASE_URL (or API_BASE_URL)");
  }
  const baseUrl = normalizeBaseUrl(baseUrlRaw);
  const email = readEnv("SMOKE_EMAIL", { required: true }).toLowerCase();
  const password = readEnv("SMOKE_PASSWORD", { required: true });
  const targetGroupId = readEnv("SMOKE_GROUP_ID");
  const targetPeriod = readEnv("SMOKE_PERIOD");
  const healthcheckToken = readEnv("FULBITO_HEALTHCHECK_TOKEN");
  const allowDegradedHealth = readEnv("SMOKE_ALLOW_DEGRADED_HEALTH") === "1";
  const requireGroup = readEnv("SMOKE_REQUIRE_GROUP") !== "0";

  logStep("config", `baseUrl=${baseUrl}`);

  const healthPocketbase = await requestJson({
    url: `${baseUrl}/api/health/pocketbase`
  });
  if (!allowDegradedHealth) {
    ensure(
      healthPocketbase.status === 200,
      `PocketBase health expected 200, got ${healthPocketbase.status}. payload=${JSON.stringify(healthPocketbase.payload)}`
    );
  } else {
    ensure(
      healthPocketbase.status === 200 || healthPocketbase.status === 503,
      `PocketBase health expected 200|503, got ${healthPocketbase.status}. payload=${JSON.stringify(healthPocketbase.payload)}`
    );
  }
  logStep("health", `pocketbase status=${healthPocketbase.status}`);

  if (healthcheckToken) {
    const healthProvider = await requestJson({
      url: `${baseUrl}/api/health/provider`,
      headers: {
        "x-healthcheck-token": healthcheckToken
      }
    });
    if (!allowDegradedHealth) {
      ensure(
        healthProvider.status === 200,
        `Provider health expected 200, got ${healthProvider.status}. payload=${JSON.stringify(healthProvider.payload)}`
      );
    } else {
      ensure(
        healthProvider.status === 200 || healthProvider.status === 503,
        `Provider health expected 200|503, got ${healthProvider.status}. payload=${JSON.stringify(healthProvider.payload)}`
      );
    }
    logStep("health", `provider status=${healthProvider.status}`);
  } else {
    logStep("health", "FULBITO_HEALTHCHECK_TOKEN not set, skipping /api/health/provider");
  }

  const login = await requestJson({
    url: `${baseUrl}/api/auth/login-password`,
    method: "POST",
    body: {
      email,
      password
    }
  });
  ensure(login.status === 200, `Login expected 200, got ${login.status}. payload=${JSON.stringify(login.payload)}`);
  ensure(login.payload && typeof login.payload === "object", "Login payload was empty");
  ensure(typeof login.payload.accessToken === "string", "Login payload missing accessToken");
  ensure(typeof login.payload.refreshToken === "string", "Login payload missing refreshToken");
  const accessToken = login.payload.accessToken;
  let refreshToken = login.payload.refreshToken;
  logStep("auth", "login ok");

  const me = await requestJson({
    url: `${baseUrl}/api/auth/me`,
    token: accessToken
  });
  ensure(me.status === 200, `GET /api/auth/me expected 200, got ${me.status}. payload=${JSON.stringify(me.payload)}`);
  const userId = me?.payload?.user?.id;
  ensure(typeof userId === "string" && userId.length > 0, "GET /api/auth/me payload missing user.id");
  logStep("auth", `session user=${userId}`);

  const unauthorizedGroups = await requestJson({
    url: `${baseUrl}/api/groups`
  });
  ensure(
    unauthorizedGroups.status === 401,
    `GET /api/groups without bearer expected 401, got ${unauthorizedGroups.status}`
  );
  logStep("authz", "unauthorized access guard ok");

  const groupsResponse = await requestJson({
    url: `${baseUrl}/api/groups`,
    token: accessToken
  });
  ensure(
    groupsResponse.status === 200,
    `GET /api/groups expected 200, got ${groupsResponse.status}. payload=${JSON.stringify(groupsResponse.payload)}`
  );
  const groups = Array.isArray(groupsResponse?.payload?.groups) ? groupsResponse.payload.groups : [];
  logStep("groups", `groups=${groups.length}`);

  const selectedGroup = pickGroup(groups, targetGroupId);
  if (!selectedGroup && requireGroup) {
    throw new SmokeFailure(
      "No group available for group-scoped smoke checks. Set SMOKE_GROUP_ID or run with SMOKE_REQUIRE_GROUP=0."
    );
  }

  if (selectedGroup) {
    ensure(typeof selectedGroup.id === "string", "Selected group missing id");
    ensure(typeof selectedGroup.leagueId === "number", "Selected group missing leagueId");
    ensure(typeof selectedGroup.season === "string", "Selected group missing season");

    logStep("groups", `selectedGroup=${selectedGroup.id}`);

    const fechas = await requestJson({
      url: `${baseUrl}/api/fechas?leagueId=${encodeURIComponent(String(selectedGroup.leagueId))}&season=${encodeURIComponent(selectedGroup.season)}${
        selectedGroup.competitionStage ? `&competitionStage=${encodeURIComponent(selectedGroup.competitionStage)}` : ""
      }`,
      token: accessToken
    });
    ensure(
      fechas.status === 200,
      `GET /api/fechas expected 200, got ${fechas.status}. payload=${JSON.stringify(fechas.payload)}`
    );
    const fechasRows = Array.isArray(fechas?.payload?.fechas) ? fechas.payload.fechas : [];
    const period = targetPeriod || fechas?.payload?.defaultFecha || fechasRows[0]?.id || "";
    ensure(typeof period === "string" && period.length > 0, "Could not resolve period for group smoke checks");
    logStep("fechas", `period=${period}`);

    const pronosticos = await requestJson({
      url: `${baseUrl}/api/pronosticos?groupId=${encodeURIComponent(selectedGroup.id)}&period=${encodeURIComponent(period)}`,
      token: accessToken
    });
    ensure(
      pronosticos.status === 200,
      `GET /api/pronosticos expected 200, got ${pronosticos.status}. payload=${JSON.stringify(pronosticos.payload)}`
    );
    logStep("pronosticos", "ok");

    const fixture = await requestJson({
      url: `${baseUrl}/api/fixture?groupId=${encodeURIComponent(selectedGroup.id)}&period=${encodeURIComponent(period)}`,
      token: accessToken
    });
    ensure(
      fixture.status === 200,
      `GET /api/fixture expected 200, got ${fixture.status}. payload=${JSON.stringify(fixture.payload)}`
    );
    logStep("fixture", "ok");

    const leaderboard = await requestJson({
      url: `${baseUrl}/api/leaderboard?groupId=${encodeURIComponent(selectedGroup.id)}&period=${encodeURIComponent(period)}`,
      token: accessToken
    });
    ensure(
      leaderboard.status === 200,
      `GET /api/leaderboard expected 200, got ${leaderboard.status}. payload=${JSON.stringify(leaderboard.payload)}`
    );
    logStep("leaderboard", "ok");

    const profile = await requestJson({
      url: `${baseUrl}/api/profile`,
      token: accessToken
    });
    ensure(
      profile.status === 200,
      `GET /api/profile expected 200, got ${profile.status}. payload=${JSON.stringify(profile.payload)}`
    );
    logStep("profile", "ok");
  }

  const refresh = await requestJson({
    url: `${baseUrl}/api/auth/refresh`,
    method: "POST",
    body: {
      refreshToken
    }
  });
  ensure(
    refresh.status === 200,
    `POST /api/auth/refresh expected 200, got ${refresh.status}. payload=${JSON.stringify(refresh.payload)}`
  );
  ensure(typeof refresh?.payload?.accessToken === "string", "Refresh payload missing accessToken");
  ensure(typeof refresh?.payload?.refreshToken === "string", "Refresh payload missing refreshToken");
  refreshToken = refresh.payload.refreshToken;
  logStep("auth", "refresh ok");

  const logout = await requestJson({
    url: `${baseUrl}/api/auth/logout`,
    method: "POST",
    body: {
      refreshToken
    }
  });
  ensure(
    logout.status === 200,
    `POST /api/auth/logout expected 200, got ${logout.status}. payload=${JSON.stringify(logout.payload)}`
  );
  logStep("auth", "logout ok");

  const refreshAfterLogout = await requestJson({
    url: `${baseUrl}/api/auth/refresh`,
    method: "POST",
    body: {
      refreshToken
    }
  });
  ensure(
    refreshAfterLogout.status === 401,
    `POST /api/auth/refresh after logout expected 401, got ${refreshAfterLogout.status}. payload=${JSON.stringify(refreshAfterLogout.payload)}`
  );
  logStep("auth", "revoked refresh token check ok");

  const durationMs = Date.now() - startedAt;
  logStep("done", `smoke succeeded in ${durationMs}ms`);
}

main().catch((error) => {
  const durationMs = Date.now() - startedAt;
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[smoke][failed][${durationMs}ms] ${message}`);
  process.exit(1);
});

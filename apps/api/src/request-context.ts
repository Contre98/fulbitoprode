import { randomUUID } from "node:crypto";
import type { Context } from "hono";
import { getSessionUserIdFromRequest } from "@fulbito/server-core/request-auth";

const REQUEST_CONTEXT_KEY = "fulbito.request-context";

export interface ApiRateLimitContext {
  key: string;
  limit: number;
  windowMs: number;
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export interface ApiRequestContext {
  requestId: string;
  traceId: string;
  startedAtMs: number;
  method: string;
  path: string;
  auth: {
    userId: string | null;
    authenticated: boolean;
  };
  rateLimit: ApiRateLimitContext | null;
}

export interface ApiRouteRuntimeContext {
  params?: Promise<Record<string, string>>;
  requestContext?: ApiRequestContext;
  setRateLimitContext?: (rateLimit: ApiRateLimitContext) => void;
}

function resolveTraceId(request: Request, fallback: string) {
  const candidates = [
    request.headers.get("x-trace-id"),
    request.headers.get("x-request-id"),
    request.headers.get("x-correlation-id")
  ];

  for (const raw of candidates) {
    const value = raw?.trim();
    if (value) {
      return value;
    }
  }

  return fallback;
}

export function initializeRequestContext(c: Context): ApiRequestContext {
  const requestId = randomUUID();
  const traceId = resolveTraceId(c.req.raw, requestId);
  const userId = getSessionUserIdFromRequest(c.req.raw);

  const context: ApiRequestContext = {
    requestId,
    traceId,
    startedAtMs: Date.now(),
    method: c.req.method.toUpperCase(),
    path: c.req.path,
    auth: {
      userId,
      authenticated: Boolean(userId)
    },
    rateLimit: null
  };

  c.set(REQUEST_CONTEXT_KEY, context);
  return context;
}

export function getRequestContext(c: Context): ApiRequestContext {
  const existing = c.get(REQUEST_CONTEXT_KEY) as ApiRequestContext | undefined;
  if (existing) {
    return existing;
  }
  return initializeRequestContext(c);
}

export function setRateLimitContext(c: Context, rateLimit: ApiRateLimitContext) {
  const context = getRequestContext(c);
  context.rateLimit = rateLimit;
}

export function logRequestCompletion(input: {
  context: ApiRequestContext;
  status: number;
  durationMs: number;
  error?: unknown;
}) {
  const basePayload: Record<string, unknown> = {
    ts: new Date().toISOString(),
    event: "api.request",
    level: input.error ? "error" : "info",
    requestId: input.context.requestId,
    traceId: input.context.traceId,
    method: input.context.method,
    path: input.context.path,
    status: input.status,
    durationMs: input.durationMs,
    userId: input.context.auth.userId,
    authenticated: input.context.auth.authenticated,
    rateLimit: input.context.rateLimit
  };

  if (input.error) {
    if (input.error instanceof Error) {
      basePayload.error = {
        name: input.error.name,
        message: input.error.message
      };
    } else {
      basePayload.error = { message: String(input.error) };
    }
    console.error(JSON.stringify(basePayload));
    return;
  }

  console.info(JSON.stringify(basePayload));
}

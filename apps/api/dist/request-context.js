import { randomUUID } from "node:crypto";
import { getSessionUserIdFromRequest } from "@fulbito/server-core/request-auth";
const REQUEST_CONTEXT_KEY = "fulbito.request-context";
function resolveTraceId(request, fallback) {
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
export function initializeRequestContext(c) {
    const requestId = randomUUID();
    const traceId = resolveTraceId(c.req.raw, requestId);
    const userId = getSessionUserIdFromRequest(c.req.raw);
    const context = {
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
export function getRequestContext(c) {
    const existing = c.get(REQUEST_CONTEXT_KEY);
    if (existing) {
        return existing;
    }
    return initializeRequestContext(c);
}
export function setRateLimitContext(c, rateLimit) {
    const context = getRequestContext(c);
    context.rateLimit = rateLimit;
}
export function logRequestCompletion(input) {
    const basePayload = {
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
        }
        else {
            basePayload.error = { message: String(input.error) };
        }
        console.error(JSON.stringify(basePayload));
        return;
    }
    console.info(JSON.stringify(basePayload));
}

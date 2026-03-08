import type { Context } from "hono";
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
export declare function initializeRequestContext(c: Context): ApiRequestContext;
export declare function getRequestContext(c: Context): ApiRequestContext;
export declare function setRateLimitContext(c: Context, rateLimit: ApiRateLimitContext): void;
export declare function logRequestCompletion(input: {
    context: ApiRequestContext;
    status: number;
    durationMs: number;
    error?: unknown;
}): void;

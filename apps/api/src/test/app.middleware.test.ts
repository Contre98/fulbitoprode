import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../app";
import { mapApiError } from "../error-mapper";
import { initializeRequestContext } from "../request-context";

function createTestApp() {
  const localApp = new Hono();

  localApp.use("*", async (c, next) => {
    const requestContext = initializeRequestContext(c);
    c.header("x-request-id", requestContext.requestId);
    c.header("x-trace-id", requestContext.traceId);
    c.header("x-powered-by", "fulbito-api");
    await next();
  });

  localApp.get("/boom", () => {
    throw new Error("boom");
  });

  localApp.onError((error, c) => mapApiError(error, c));
  return localApp;
}

describe("apps/api middleware and error mapping", () => {
  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns not-found payloads with request correlation headers", async () => {
    const response = await app.fetch(new Request("http://localhost/__missing_route__"));
    expect(response.status).toBe(404);

    const body = (await response.json()) as { error?: string; requestId?: string };
    expect(body.error).toBe("Not Found");
    expect(typeof body.requestId).toBe("string");
    expect(body.requestId).toBe(response.headers.get("x-request-id"));
    expect(response.headers.get("x-trace-id")).toBeTruthy();
    expect(response.headers.get("x-response-time")).toMatch(/ms$/);
    expect(response.headers.get("x-powered-by")).toBe("fulbito-api");
  });

  it("maps unhandled errors to centralized internal-server-error payload", async () => {
    const localApp = createTestApp();
    const response = await localApp.fetch(new Request("http://localhost/boom"));
    expect(response.status).toBe(500);

    const body = (await response.json()) as { error?: string; requestId?: string };
    expect(body.error).toBe("Internal Server Error");
    expect(typeof body.requestId).toBe("string");
    expect(body.requestId).toBe(response.headers.get("x-request-id"));
    expect(response.headers.get("x-trace-id")).toBeTruthy();
    expect(response.headers.get("x-response-time")).toMatch(/ms$/);
    expect(response.headers.get("x-powered-by")).toBe("fulbito-api");
  });
});

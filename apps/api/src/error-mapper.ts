import type { Context } from "hono";
import { jsonResponse } from "#http";
import { getRequestContext } from "./request-context";

function readErrorStatus(error: unknown) {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = Number((error as { status?: unknown }).status);
    if (Number.isFinite(status) && status >= 400 && status <= 599) {
      return status;
    }
  }
  return 500;
}

function readErrorMessage(error: unknown, status: number) {
  if (status >= 500) {
    return "Internal Server Error";
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }

  return "Request failed";
}

function toErrorPayload(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }
  return {
    message: String(error)
  };
}

export function mapApiError(error: unknown, c: Context) {
  const context = getRequestContext(c);
  const status = readErrorStatus(error);
  const message = readErrorMessage(error, status);
  const durationMs = Date.now() - context.startedAtMs;

  console.error(
    JSON.stringify({
      ts: new Date().toISOString(),
      event: "api.error",
      requestId: context.requestId,
      traceId: context.traceId,
      method: context.method,
      path: context.path,
      status,
      durationMs,
      error: toErrorPayload(error)
    })
  );

  return jsonResponse(
    {
      error: message,
      requestId: context.requestId
    },
    {
      status,
      headers: {
        "x-request-id": context.requestId,
        "x-trace-id": context.traceId,
        "x-powered-by": "fulbito-api",
        "x-response-time": `${durationMs}ms`
      }
    }
  );
}

import { jsonResponse } from "#http";
import { getRequestContext } from "./request-context";
function readErrorStatus(error) {
    if (typeof error === "object" && error !== null && "status" in error) {
        const status = Number(error.status);
        if (Number.isFinite(status) && status >= 400 && status <= 599) {
            return status;
        }
    }
    return 500;
}
function readErrorMessage(error, status) {
    if (status >= 500) {
        return "Internal Server Error";
    }
    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message.trim();
    }
    return "Request failed";
}
export function mapApiError(error, c) {
    const context = getRequestContext(c);
    const status = readErrorStatus(error);
    const message = readErrorMessage(error, status);
    const durationMs = Date.now() - context.startedAtMs;
    return jsonResponse({
        error: message,
        requestId: context.requestId
    }, {
        status,
        headers: {
            "x-request-id": context.requestId,
            "x-trace-id": context.traceId,
            "x-powered-by": "fulbito-api",
            "x-response-time": `${durationMs}ms`
        }
    });
}

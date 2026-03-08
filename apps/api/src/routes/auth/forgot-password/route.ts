import { z } from "zod";
import { jsonResponse } from "#http";
import { requestPasswordReset } from "@fulbito/server-core/m3-repo";
import { enforceRateLimit, getRequesterFingerprint } from "@fulbito/server-core/rate-limit";
import type { ApiRateLimitContext } from "../../../request-context";
import { parseJsonBody, RequestBodyValidationError } from "../../../validation";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENERIC_SUCCESS_MESSAGE = "If an account exists for this email, we sent password reset instructions.";
const forgotPasswordPayloadSchema = z.object({
  email: z.string().optional()
});

interface RouteContext {
  setRateLimitContext?: (rateLimit: ApiRateLimitContext) => void;
}

export async function POST(request: Request, context?: RouteContext) {
  const clientKey = getRequesterFingerprint(request, "forgot-password:unknown");
  const rateLimitKey = `auth:forgot-password:${clientKey}`;
  const rateLimitConfig = {
    limit: 8,
    windowMs: 15 * 60 * 1000
  };
  const rateLimit = enforceRateLimit(rateLimitKey, rateLimitConfig);
  context?.setRateLimitContext?.({
    key: rateLimitKey,
    limit: rateLimitConfig.limit,
    windowMs: rateLimitConfig.windowMs,
    allowed: rateLimit.allowed,
    remaining: rateLimit.remaining,
    retryAfterSeconds: rateLimit.retryAfterSeconds
  });
  if (!rateLimit.allowed) {
    return jsonResponse(
      { error: "Too many password reset attempts. Try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds)
        }
      }
    );
  }

  try {
    const body = await parseJsonBody(request, forgotPasswordPayloadSchema);

    const email = body.email?.trim().toLowerCase() || "";
    if (!email) {
      return jsonResponse({ error: "Email is required" }, { status: 400 });
    }
    if (email.length > 190 || !EMAIL_PATTERN.test(email)) {
      return jsonResponse({ error: "Email is invalid" }, { status: 400 });
    }

    try {
      await requestPasswordReset(email);
    } catch {
      // Keep a generic success response to avoid account enumeration.
    }

    return jsonResponse(
      {
        ok: true,
        message: GENERIC_SUCCESS_MESSAGE
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof RequestBodyValidationError) {
      return jsonResponse({ error: error.message }, { status: error.status });
    }
    return jsonResponse({ error: "Invalid payload" }, { status: 400 });
  }
}

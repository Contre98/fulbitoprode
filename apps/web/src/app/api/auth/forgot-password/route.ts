import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/m3-repo";
import { enforceRateLimit, getRequesterFingerprint } from "@/lib/rate-limit";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENERIC_SUCCESS_MESSAGE = "If an account exists for this email, we sent password reset instructions.";

export async function POST(request: Request) {
  const clientKey = getRequesterFingerprint(request, "forgot-password:unknown");
  const rateLimit = enforceRateLimit(`auth:forgot-password:${clientKey}`, {
    limit: 8,
    windowMs: 15 * 60 * 1000
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many password reset attempts. Try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds)
        }
      }
    );
  }

  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() || "";
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  if (email.length > 190 || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "Email is invalid" }, { status: 400 });
  }

  try {
    await requestPasswordReset(email);
  } catch {
    // Keep a generic success response to avoid account enumeration.
  }

  return NextResponse.json(
    {
      ok: true,
      message: GENERIC_SUCCESS_MESSAGE
    },
    { status: 200 }
  );
}

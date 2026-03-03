import { createHmac, timingSafeEqual } from "node:crypto";
import { getSessionSecret } from "@/lib/env";

const SESSION_COOKIE_NAME = "fulbito_session";
const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

interface SessionPayload {
  uid: string;
  pbt: string;
  exp: number;
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }
  return timingSafeEqual(aBuffer, bBuffer);
}

export function createSessionToken(input: { userId: string; pbToken: string }, maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS) {
  const payload: SessionPayload = {
    uid: input.userId,
    pbt: input.pbToken,
    exp: Date.now() + maxAgeSeconds * 1000
  };

  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(payloadEncoded);
  return `${payloadEncoded}.${signature}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) {
    return null;
  }

  const [payloadEncoded, signature] = token.split(".");
  if (!payloadEncoded || !signature) {
    return null;
  }

  const expected = sign(payloadEncoded);
  if (!safeEqual(signature, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(payloadEncoded)) as SessionPayload;
    if (!payload.uid || !payload.pbt || typeof payload.exp !== "number") {
      return null;
    }

    if (payload.exp <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getSessionCookieName() {
  return SESSION_COOKIE_NAME;
}

export function getSessionMaxAgeSeconds() {
  return DEFAULT_MAX_AGE_SECONDS;
}

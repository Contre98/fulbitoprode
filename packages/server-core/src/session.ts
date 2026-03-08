import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { getSessionSecret } from "./env";

const ACCESS_TOKEN_MAX_AGE_SECONDS = 60 * 15;
const REFRESH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export interface AccessTokenPayload {
  typ: "access";
  sid: string;
  uid: string;
  pbt: string;
  exp: number;
}

export interface RefreshTokenPayload {
  typ: "refresh";
  sid: string;
  uid: string;
  pbt: string;
  jti: string;
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

function createSignedToken(payload: object) {
  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(payloadEncoded);
  return `${payloadEncoded}.${signature}`;
}

function verifySignedToken<T extends { exp: number }>(token: string | undefined | null): T | null {
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
    const payload = JSON.parse(base64UrlDecode(payloadEncoded)) as T;
    if (!payload || typeof payload.exp !== "number" || payload.exp <= Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function createAccessToken(
  input: { userId: string; pbToken: string; sessionId?: string },
  maxAgeSeconds = ACCESS_TOKEN_MAX_AGE_SECONDS
) {
  const payload: AccessTokenPayload = {
    typ: "access",
    sid: input.sessionId || randomUUID(),
    uid: input.userId,
    pbt: input.pbToken,
    exp: Date.now() + maxAgeSeconds * 1000
  };
  return createSignedToken(payload);
}

export function verifyAccessToken(token: string | undefined | null): AccessTokenPayload | null {
  const payload = verifySignedToken<AccessTokenPayload>(token);
  if (!payload || payload.typ !== "access" || !payload.sid || !payload.uid || !payload.pbt) {
    return null;
  }
  return payload;
}

export function createRefreshToken(
  input: { userId: string; pbToken: string; sessionId: string },
  maxAgeSeconds = REFRESH_TOKEN_MAX_AGE_SECONDS
) {
  const payload: RefreshTokenPayload = {
    typ: "refresh",
    sid: input.sessionId,
    uid: input.userId,
    pbt: input.pbToken,
    jti: randomUUID(),
    exp: Date.now() + maxAgeSeconds * 1000
  };
  return createSignedToken(payload);
}

export function verifyRefreshToken(token: string | undefined | null): RefreshTokenPayload | null {
  const payload = verifySignedToken<RefreshTokenPayload>(token);
  if (!payload || payload.typ !== "refresh" || !payload.sid || !payload.uid || !payload.pbt || !payload.jti) {
    return null;
  }
  return payload;
}

export function getAccessTokenMaxAgeSeconds() {
  return ACCESS_TOKEN_MAX_AGE_SECONDS;
}

export function getRefreshTokenMaxAgeSeconds() {
  return REFRESH_TOKEN_MAX_AGE_SECONDS;
}

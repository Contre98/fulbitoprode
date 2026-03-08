import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { getSessionSecret } from "./env";
const SESSION_COOKIE_NAME = "fulbito_session";
const ACCESS_COOKIE_NAME = "fulbito_access";
const REFRESH_COOKIE_NAME = "fulbito_refresh";
const LEGACY_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const ACCESS_TOKEN_MAX_AGE_SECONDS = 60 * 15;
const REFRESH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
function base64UrlEncode(value) {
    return Buffer.from(value, "utf8").toString("base64url");
}
function base64UrlDecode(value) {
    return Buffer.from(value, "base64url").toString("utf8");
}
function sign(value) {
    return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}
function safeEqual(a, b) {
    const aBuffer = Buffer.from(a);
    const bBuffer = Buffer.from(b);
    if (aBuffer.length !== bBuffer.length) {
        return false;
    }
    return timingSafeEqual(aBuffer, bBuffer);
}
function createSignedToken(payload) {
    const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
    const signature = sign(payloadEncoded);
    return `${payloadEncoded}.${signature}`;
}
function verifySignedToken(token) {
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
        const payload = JSON.parse(base64UrlDecode(payloadEncoded));
        if (!payload || typeof payload.exp !== "number" || payload.exp <= Date.now()) {
            return null;
        }
        return payload;
    }
    catch {
        return null;
    }
}
export function createSessionToken(input, maxAgeSeconds = LEGACY_SESSION_MAX_AGE_SECONDS) {
    const payload = {
        uid: input.userId,
        pbt: input.pbToken,
        exp: Date.now() + maxAgeSeconds * 1000
    };
    return createSignedToken(payload);
}
export function verifySessionToken(token) {
    const payload = verifySignedToken(token);
    if (!payload || !payload.uid || !payload.pbt) {
        return null;
    }
    return payload;
}
export function createAccessToken(input, maxAgeSeconds = ACCESS_TOKEN_MAX_AGE_SECONDS) {
    const payload = {
        typ: "access",
        sid: input.sessionId || randomUUID(),
        uid: input.userId,
        pbt: input.pbToken,
        exp: Date.now() + maxAgeSeconds * 1000
    };
    return createSignedToken(payload);
}
export function verifyAccessToken(token) {
    const payload = verifySignedToken(token);
    if (!payload || payload.typ !== "access" || !payload.sid || !payload.uid || !payload.pbt) {
        return null;
    }
    return payload;
}
export function createRefreshToken(input, maxAgeSeconds = REFRESH_TOKEN_MAX_AGE_SECONDS) {
    const payload = {
        typ: "refresh",
        sid: input.sessionId,
        uid: input.userId,
        pbt: input.pbToken,
        jti: randomUUID(),
        exp: Date.now() + maxAgeSeconds * 1000
    };
    return createSignedToken(payload);
}
export function verifyRefreshToken(token) {
    const payload = verifySignedToken(token);
    if (!payload || payload.typ !== "refresh" || !payload.sid || !payload.uid || !payload.pbt || !payload.jti) {
        return null;
    }
    return payload;
}
export function getSessionCookieName() {
    return SESSION_COOKIE_NAME;
}
export function getAccessCookieName() {
    return ACCESS_COOKIE_NAME;
}
export function getRefreshCookieName() {
    return REFRESH_COOKIE_NAME;
}
export function getSessionMaxAgeSeconds() {
    return LEGACY_SESSION_MAX_AGE_SECONDS;
}
export function getAccessTokenMaxAgeSeconds() {
    return ACCESS_TOKEN_MAX_AGE_SECONDS;
}
export function getRefreshTokenMaxAgeSeconds() {
    return REFRESH_TOKEN_MAX_AGE_SECONDS;
}

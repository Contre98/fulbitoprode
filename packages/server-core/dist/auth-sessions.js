import { createHash, randomUUID } from "node:crypto";
const sessionStore = new Map();
function hashToken(token) {
    return createHash("sha256").update(token).digest("hex");
}
export function issueRefreshSession(input) {
    const sessionId = randomUUID();
    const record = {
        sessionId,
        userId: input.userId,
        refreshTokenHash: hashToken(input.refreshToken),
        issuedAt: new Date().toISOString(),
        expiresAt: input.expiresAt.toISOString(),
        revokedAt: null,
        replacedBySessionId: null
    };
    sessionStore.set(sessionId, record);
    return record;
}
export function issueRefreshSessionWithId(input) {
    const record = {
        sessionId: input.sessionId,
        userId: input.userId,
        refreshTokenHash: hashToken(input.refreshToken),
        issuedAt: new Date().toISOString(),
        expiresAt: input.expiresAt.toISOString(),
        revokedAt: null,
        replacedBySessionId: null
    };
    sessionStore.set(record.sessionId, record);
    return record;
}
export function verifyRefreshSession(input) {
    const record = sessionStore.get(input.sessionId);
    if (!record) {
        return { ok: false, reason: "not_found" };
    }
    if (record.userId !== input.userId) {
        return { ok: false, reason: "mismatch" };
    }
    if (record.revokedAt) {
        return { ok: false, reason: "revoked" };
    }
    if (new Date(record.expiresAt).getTime() <= Date.now()) {
        return { ok: false, reason: "expired" };
    }
    if (record.refreshTokenHash !== hashToken(input.refreshToken)) {
        return { ok: false, reason: "invalid_token" };
    }
    return { ok: true, record };
}
export function rotateRefreshSession(input) {
    const previous = verifyRefreshSession({
        sessionId: input.priorSessionId,
        userId: input.priorUserId,
        refreshToken: input.priorRefreshToken
    });
    if (!previous.ok) {
        return previous;
    }
    const nextRecord = issueRefreshSession({
        userId: input.priorUserId,
        refreshToken: input.nextRefreshToken,
        expiresAt: input.nextExpiresAt
    });
    const prior = previous.record;
    prior.revokedAt = new Date().toISOString();
    prior.replacedBySessionId = nextRecord.sessionId;
    sessionStore.set(prior.sessionId, prior);
    return { ok: true, previous: prior, next: nextRecord };
}
export function revokeRefreshSession(sessionId) {
    const record = sessionStore.get(sessionId);
    if (!record) {
        return false;
    }
    if (!record.revokedAt) {
        record.revokedAt = new Date().toISOString();
        sessionStore.set(record.sessionId, record);
    }
    return true;
}

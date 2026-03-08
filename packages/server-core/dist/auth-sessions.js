import { createHash, randomUUID } from "node:crypto";
import { createAuthSessionRecord, getAuthSessionRecord, patchAuthSessionRecord } from "./m3-repo";
const sessionStore = new Map();
let warnedPocketBaseFallback = false;
function hashToken(token) {
    return createHash("sha256").update(token).digest("hex");
}
function shouldUsePocketBase(authToken) {
    const mode = process.env.FULBITO_AUTH_SESSIONS_MODE?.trim().toLowerCase();
    if (mode === "memory") {
        return false;
    }
    return Boolean(authToken);
}
function warnPocketBaseFallback(action, error) {
    if (warnedPocketBaseFallback) {
        return;
    }
    warnedPocketBaseFallback = true;
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[auth-sessions] ${action} failed in PocketBase, using in-memory fallback: ${message}`);
}
function createMemoryRecord(input) {
    const record = {
        recordId: `memory:${input.sessionId}`,
        sessionId: input.sessionId,
        userId: input.userId,
        refreshTokenHash: hashToken(input.refreshToken),
        issuedAt: input.issuedAt,
        expiresAt: input.expiresAt.toISOString(),
        revokedAt: null,
        replacedBySessionId: null,
        storage: "memory"
    };
    sessionStore.set(record.sessionId, record);
    return record;
}
export async function issueRefreshSession(input) {
    const sessionId = randomUUID();
    return issueRefreshSessionWithId({
        sessionId,
        userId: input.userId,
        refreshToken: input.refreshToken,
        expiresAt: input.expiresAt,
        authToken: input.authToken
    });
}
export async function issueRefreshSessionWithId(input) {
    const issuedAt = new Date().toISOString();
    if (shouldUsePocketBase(input.authToken)) {
        try {
            const record = await createAuthSessionRecord({
                sessionId: input.sessionId,
                userId: input.userId,
                refreshTokenHash: hashToken(input.refreshToken),
                issuedAt,
                expiresAt: input.expiresAt.toISOString()
            }, input.authToken);
            return {
                ...record,
                storage: "pocketbase"
            };
        }
        catch (error) {
            warnPocketBaseFallback("issue", error);
        }
    }
    return createMemoryRecord({
        sessionId: input.sessionId,
        userId: input.userId,
        refreshToken: input.refreshToken,
        issuedAt,
        expiresAt: input.expiresAt
    });
}
export async function verifyRefreshSession(input) {
    let record = null;
    if (shouldUsePocketBase(input.authToken)) {
        try {
            const persisted = await getAuthSessionRecord({
                sessionId: input.sessionId,
                userId: input.userId
            }, input.authToken);
            if (persisted) {
                record = {
                    ...persisted,
                    storage: "pocketbase"
                };
            }
        }
        catch (error) {
            warnPocketBaseFallback("verify", error);
        }
    }
    if (!record) {
        record = sessionStore.get(input.sessionId) || null;
    }
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
export async function rotateRefreshSession(input) {
    const previous = await verifyRefreshSession({
        sessionId: input.priorSessionId,
        userId: input.priorUserId,
        refreshToken: input.priorRefreshToken,
        authToken: input.authToken
    });
    if (!previous.ok) {
        return previous;
    }
    const nextSessionId = input.nextSessionId || randomUUID();
    const nowIso = new Date().toISOString();
    if (previous.record.storage === "pocketbase" && input.authToken) {
        try {
            const next = await createAuthSessionRecord({
                sessionId: nextSessionId,
                userId: input.priorUserId,
                refreshTokenHash: hashToken(input.nextRefreshToken),
                issuedAt: nowIso,
                expiresAt: input.nextExpiresAt.toISOString()
            }, input.authToken);
            const prior = await patchAuthSessionRecord({
                recordId: previous.record.recordId,
                revokedAt: nowIso,
                replacedBySessionId: nextSessionId
            }, input.authToken);
            return {
                ok: true,
                previous: {
                    ...prior,
                    storage: "pocketbase"
                },
                next: {
                    ...next,
                    storage: "pocketbase"
                }
            };
        }
        catch (error) {
            warnPocketBaseFallback("rotate", error);
            return { ok: false, reason: "storage_error" };
        }
    }
    const next = createMemoryRecord({
        sessionId: nextSessionId,
        userId: input.priorUserId,
        refreshToken: input.nextRefreshToken,
        issuedAt: nowIso,
        expiresAt: input.nextExpiresAt
    });
    const prior = {
        ...previous.record,
        revokedAt: nowIso,
        replacedBySessionId: next.sessionId,
        storage: "memory"
    };
    sessionStore.set(prior.sessionId, prior);
    return {
        ok: true,
        previous: prior,
        next
    };
}
export async function revokeRefreshSession(input) {
    const nowIso = new Date().toISOString();
    if (shouldUsePocketBase(input.authToken)) {
        try {
            const persisted = await getAuthSessionRecord({
                sessionId: input.sessionId,
                userId: input.userId
            }, input.authToken);
            if (persisted) {
                await patchAuthSessionRecord({
                    recordId: persisted.recordId,
                    revokedAt: nowIso
                }, input.authToken);
                return true;
            }
        }
        catch (error) {
            warnPocketBaseFallback("revoke", error);
            return false;
        }
    }
    const memory = sessionStore.get(input.sessionId);
    if (!memory || memory.userId !== input.userId) {
        return false;
    }
    if (!memory.revokedAt) {
        memory.revokedAt = nowIso;
        sessionStore.set(memory.sessionId, memory);
    }
    return true;
}

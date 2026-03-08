import { createHash, randomUUID } from "node:crypto";

interface RefreshSessionRecord {
  sessionId: string;
  userId: string;
  refreshTokenHash: string;
  issuedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  replacedBySessionId: string | null;
}

const sessionStore = new Map<string, RefreshSessionRecord>();

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function issueRefreshSession(input: { userId: string; refreshToken: string; expiresAt: Date }) {
  const sessionId = randomUUID();
  const record: RefreshSessionRecord = {
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

export function issueRefreshSessionWithId(input: { sessionId: string; userId: string; refreshToken: string; expiresAt: Date }) {
  const record: RefreshSessionRecord = {
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

export function verifyRefreshSession(input: { sessionId: string; userId: string; refreshToken: string }) {
  const record = sessionStore.get(input.sessionId);
  if (!record) {
    return { ok: false as const, reason: "not_found" as const };
  }

  if (record.userId !== input.userId) {
    return { ok: false as const, reason: "mismatch" as const };
  }

  if (record.revokedAt) {
    return { ok: false as const, reason: "revoked" as const };
  }

  if (new Date(record.expiresAt).getTime() <= Date.now()) {
    return { ok: false as const, reason: "expired" as const };
  }

  if (record.refreshTokenHash !== hashToken(input.refreshToken)) {
    return { ok: false as const, reason: "invalid_token" as const };
  }

  return { ok: true as const, record };
}

export function rotateRefreshSession(input: {
  priorSessionId: string;
  priorUserId: string;
  priorRefreshToken: string;
  nextRefreshToken: string;
  nextExpiresAt: Date;
}) {
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

  return { ok: true as const, previous: prior, next: nextRecord };
}

export function revokeRefreshSession(sessionId: string) {
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

import { createHash, randomUUID } from "node:crypto";
import { createAuthSessionRecord, getAuthSessionRecord, patchAuthSessionRecord } from "./m3-repo";

interface RefreshSessionRecord {
  recordId: string;
  sessionId: string;
  userId: string;
  refreshTokenHash: string;
  issuedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  replacedBySessionId: string | null;
  storage: "memory" | "pocketbase";
}

const sessionStore = new Map<string, RefreshSessionRecord>();
let warnedPocketBaseFallback = false;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function shouldUsePocketBase(authToken: string | undefined) {
  const mode = process.env.FULBITO_AUTH_SESSIONS_MODE?.trim().toLowerCase();
  if (mode === "memory") {
    return false;
  }
  return Boolean(authToken);
}

function warnPocketBaseFallback(action: string, error: unknown) {
  if (warnedPocketBaseFallback) {
    return;
  }
  warnedPocketBaseFallback = true;
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[auth-sessions] ${action} failed in PocketBase, using in-memory fallback: ${message}`);
}

function createMemoryRecord(input: {
  sessionId: string;
  userId: string;
  refreshToken: string;
  issuedAt: string;
  expiresAt: Date;
}) {
  const record: RefreshSessionRecord = {
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

export async function issueRefreshSession(input: {
  userId: string;
  refreshToken: string;
  expiresAt: Date;
  authToken?: string;
}) {
  const sessionId = randomUUID();
  return issueRefreshSessionWithId({
    sessionId,
    userId: input.userId,
    refreshToken: input.refreshToken,
    expiresAt: input.expiresAt,
    authToken: input.authToken
  });
}

export async function issueRefreshSessionWithId(input: {
  sessionId: string;
  userId: string;
  refreshToken: string;
  expiresAt: Date;
  authToken?: string;
}) {
  const issuedAt = new Date().toISOString();

  if (shouldUsePocketBase(input.authToken)) {
    try {
      const record = await createAuthSessionRecord(
        {
          sessionId: input.sessionId,
          userId: input.userId,
          refreshTokenHash: hashToken(input.refreshToken),
          issuedAt,
          expiresAt: input.expiresAt.toISOString()
        },
        input.authToken as string
      );

      return {
        ...record,
        storage: "pocketbase" as const
      };
    } catch (error) {
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

export async function verifyRefreshSession(input: {
  sessionId: string;
  userId: string;
  refreshToken: string;
  authToken?: string;
}) {
  const memoryRecord = sessionStore.get(input.sessionId) || null;
  if (memoryRecord && memoryRecord.userId === input.userId) {
    const incomingHash = hashToken(input.refreshToken);
    if (memoryRecord.refreshTokenHash === incomingHash && memoryRecord.revokedAt) {
      return { ok: false as const, reason: "revoked" as const };
    }
  }

  let record: RefreshSessionRecord | null = null;

  if (shouldUsePocketBase(input.authToken)) {
    try {
      const persisted = await getAuthSessionRecord(
        {
          sessionId: input.sessionId,
          userId: input.userId
        },
        input.authToken as string
      );

      if (persisted) {
        record = {
          ...persisted,
          storage: "pocketbase"
        };
      }
    } catch (error) {
      warnPocketBaseFallback("verify", error);
    }
  }

  if (!record) {
    record = sessionStore.get(input.sessionId) || null;
  }

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

export async function rotateRefreshSession(input: {
  priorSessionId: string;
  priorUserId: string;
  priorRefreshToken: string;
  nextSessionId?: string;
  nextRefreshToken: string;
  nextExpiresAt: Date;
  authToken?: string;
}) {
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
      const next = await createAuthSessionRecord(
        {
          sessionId: nextSessionId,
          userId: input.priorUserId,
          refreshTokenHash: hashToken(input.nextRefreshToken),
          issuedAt: nowIso,
          expiresAt: input.nextExpiresAt.toISOString()
        },
        input.authToken
      );

      const prior = await patchAuthSessionRecord(
        {
          recordId: previous.record.recordId,
          revokedAt: nowIso,
          replacedBySessionId: nextSessionId
        },
        input.authToken
      );

      return {
        ok: true as const,
        previous: {
          ...prior,
          storage: "pocketbase" as const
        },
        next: {
          ...next,
          storage: "pocketbase" as const
        }
      };
    } catch (error) {
      warnPocketBaseFallback("rotate", error);
      return { ok: false as const, reason: "storage_error" as const };
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
    storage: "memory" as const
  };
  sessionStore.set(prior.sessionId, prior);

  return {
    ok: true as const,
    previous: prior,
    next
  };
}

export async function revokeRefreshSession(input: {
  sessionId: string;
  userId: string;
  refreshToken?: string;
  authToken?: string;
}) {
  const nowIso = new Date().toISOString();
  const markMemoryRevoked = () => {
    const existing = sessionStore.get(input.sessionId);
    if (existing && existing.userId === input.userId) {
      if (!existing.revokedAt) {
        existing.revokedAt = nowIso;
        sessionStore.set(existing.sessionId, existing);
      }
      return true;
    }

    if (!input.refreshToken) {
      return false;
    }

    const placeholder: RefreshSessionRecord = {
      recordId: `memory:${input.sessionId}`,
      sessionId: input.sessionId,
      userId: input.userId,
      refreshTokenHash: hashToken(input.refreshToken),
      issuedAt: nowIso,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
      revokedAt: nowIso,
      replacedBySessionId: null,
      storage: "memory"
    };
    sessionStore.set(placeholder.sessionId, placeholder);
    return true;
  };

  if (shouldUsePocketBase(input.authToken)) {
    try {
      const persisted = await getAuthSessionRecord(
        {
          sessionId: input.sessionId,
          userId: input.userId
        },
        input.authToken as string
      );

      if (persisted) {
        await patchAuthSessionRecord(
          {
            recordId: persisted.recordId,
            revokedAt: nowIso
          },
          input.authToken as string
        );
        markMemoryRevoked();
        return true;
      }
    } catch (error) {
      warnPocketBaseFallback("revoke", error);
    }
  }

  return markMemoryRevoked();
}

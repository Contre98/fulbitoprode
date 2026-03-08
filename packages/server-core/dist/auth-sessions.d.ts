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
export declare function issueRefreshSession(input: {
    userId: string;
    refreshToken: string;
    expiresAt: Date;
    authToken?: string;
}): Promise<RefreshSessionRecord>;
export declare function issueRefreshSessionWithId(input: {
    sessionId: string;
    userId: string;
    refreshToken: string;
    expiresAt: Date;
    authToken?: string;
}): Promise<RefreshSessionRecord>;
export declare function verifyRefreshSession(input: {
    sessionId: string;
    userId: string;
    refreshToken: string;
    authToken?: string;
}): Promise<{
    ok: false;
    reason: "not_found";
    record?: undefined;
} | {
    ok: false;
    reason: "mismatch";
    record?: undefined;
} | {
    ok: false;
    reason: "revoked";
    record?: undefined;
} | {
    ok: false;
    reason: "expired";
    record?: undefined;
} | {
    ok: false;
    reason: "invalid_token";
    record?: undefined;
} | {
    ok: true;
    record: RefreshSessionRecord;
    reason?: undefined;
}>;
export declare function rotateRefreshSession(input: {
    priorSessionId: string;
    priorUserId: string;
    priorRefreshToken: string;
    nextSessionId?: string;
    nextRefreshToken: string;
    nextExpiresAt: Date;
    authToken?: string;
}): Promise<{
    ok: false;
    reason: "not_found";
    record?: undefined;
} | {
    ok: false;
    reason: "mismatch";
    record?: undefined;
} | {
    ok: false;
    reason: "revoked";
    record?: undefined;
} | {
    ok: false;
    reason: "expired";
    record?: undefined;
} | {
    ok: false;
    reason: "invalid_token";
    record?: undefined;
} | {
    ok: true;
    previous: {
        storage: "pocketbase";
        recordId: string;
        sessionId: string;
        userId: string;
        refreshTokenHash: string;
        issuedAt: string;
        expiresAt: string;
        revokedAt: string | null;
        replacedBySessionId: string | null;
    };
    next: {
        storage: "pocketbase";
        recordId: string;
        sessionId: string;
        userId: string;
        refreshTokenHash: string;
        issuedAt: string;
        expiresAt: string;
        revokedAt: string | null;
        replacedBySessionId: string | null;
    };
    reason?: undefined;
} | {
    ok: false;
    reason: "storage_error";
    previous?: undefined;
    next?: undefined;
} | {
    ok: true;
    previous: {
        revokedAt: string;
        replacedBySessionId: string;
        storage: "memory";
        recordId: string;
        sessionId: string;
        userId: string;
        refreshTokenHash: string;
        issuedAt: string;
        expiresAt: string;
    };
    next: RefreshSessionRecord;
    reason?: undefined;
}>;
export declare function revokeRefreshSession(input: {
    sessionId: string;
    userId: string;
    authToken?: string;
}): Promise<boolean>;
export {};

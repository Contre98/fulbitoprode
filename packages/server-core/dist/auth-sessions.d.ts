interface RefreshSessionRecord {
    sessionId: string;
    userId: string;
    refreshTokenHash: string;
    issuedAt: string;
    expiresAt: string;
    revokedAt: string | null;
    replacedBySessionId: string | null;
}
export declare function issueRefreshSession(input: {
    userId: string;
    refreshToken: string;
    expiresAt: Date;
}): RefreshSessionRecord;
export declare function issueRefreshSessionWithId(input: {
    sessionId: string;
    userId: string;
    refreshToken: string;
    expiresAt: Date;
}): RefreshSessionRecord;
export declare function verifyRefreshSession(input: {
    sessionId: string;
    userId: string;
    refreshToken: string;
}): {
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
};
export declare function rotateRefreshSession(input: {
    priorSessionId: string;
    priorUserId: string;
    priorRefreshToken: string;
    nextRefreshToken: string;
    nextExpiresAt: Date;
}): {
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
    previous: RefreshSessionRecord;
    next: RefreshSessionRecord;
};
export declare function revokeRefreshSession(sessionId: string): boolean;
export {};

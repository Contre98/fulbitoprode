interface LegacySessionPayload {
    uid: string;
    pbt: string;
    exp: number;
}
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
export declare function createSessionToken(input: {
    userId: string;
    pbToken: string;
}, maxAgeSeconds?: number): string;
export declare function verifySessionToken(token: string | undefined | null): LegacySessionPayload | null;
export declare function createAccessToken(input: {
    userId: string;
    pbToken: string;
    sessionId?: string;
}, maxAgeSeconds?: number): string;
export declare function verifyAccessToken(token: string | undefined | null): AccessTokenPayload | null;
export declare function createRefreshToken(input: {
    userId: string;
    pbToken: string;
    sessionId: string;
}, maxAgeSeconds?: number): string;
export declare function verifyRefreshToken(token: string | undefined | null): RefreshTokenPayload | null;
export declare function getSessionCookieName(): string;
export declare function getAccessCookieName(): string;
export declare function getRefreshCookieName(): string;
export declare function getSessionMaxAgeSeconds(): number;
export declare function getAccessTokenMaxAgeSeconds(): number;
export declare function getRefreshTokenMaxAgeSeconds(): number;
export {};

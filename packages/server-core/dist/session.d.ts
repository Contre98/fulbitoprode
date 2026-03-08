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
export declare function getAccessTokenMaxAgeSeconds(): number;
export declare function getRefreshTokenMaxAgeSeconds(): number;

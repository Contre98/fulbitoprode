export declare function parseCookieHeader(cookieHeader: string | null): Record<string, string>;
export declare function getBearerTokenFromRequest(request: Request): string | null;
export declare function getRefreshTokenFromRequest(request: Request): string | null;
export declare function getSessionUserIdFromRequest(request: Request): string | null;
export declare function getSessionPocketBaseTokenFromRequest(request: Request): string | null;
export declare function getRefreshPayloadFromRequest(request: Request): import("./session").RefreshTokenPayload | null;

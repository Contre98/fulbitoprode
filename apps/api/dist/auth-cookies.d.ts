export declare function authCookieHeaders(input: {
    accessToken: string;
    refreshToken: string;
    legacySessionToken: string;
}): string[];
export declare function clearAuthCookieHeaders(): string[];

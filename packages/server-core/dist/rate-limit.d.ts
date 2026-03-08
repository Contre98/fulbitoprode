export declare function getRequesterFingerprint(request: Request, fallback: string): string;
export declare function enforceRateLimit(key: string, options: {
    limit: number;
    windowMs: number;
}): {
    allowed: boolean;
    remaining: number;
    retryAfterSeconds: number;
};

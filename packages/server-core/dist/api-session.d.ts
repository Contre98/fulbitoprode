export interface ApiSession {
    userId: string;
    pbToken: string;
}
export declare function getApiSession(request: Request): ApiSession | null;
export declare function unauthorizedJson(): Response;

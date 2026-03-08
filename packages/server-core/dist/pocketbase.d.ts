export interface PocketBaseConfig {
    configured: boolean;
    url: string;
}
export declare function getPocketBaseConfig(): PocketBaseConfig;
export declare function probePocketBase(): Promise<{
    configured: boolean;
    ok: boolean;
    status: number | null;
    latencyMs: number | null;
    error: string;
} | {
    configured: boolean;
    ok: boolean;
    status: number;
    latencyMs: number;
    error: string | undefined;
}>;

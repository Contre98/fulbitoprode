export interface JsonResponseInit extends ResponseInit {
    cookies?: string[];
}
export declare function jsonResponse(body: unknown, init?: JsonResponseInit): Response;
interface CookieInput {
    name: string;
    value: string;
    maxAge?: number;
    path?: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "lax" | "strict" | "none";
}
export declare function serializeCookie(input: CookieInput): string;
export {};

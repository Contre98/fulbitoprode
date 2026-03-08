import type { ApiRateLimitContext } from "../../request-context";
interface RouteContext {
    setRateLimitContext?: (rateLimit: ApiRateLimitContext) => void;
}
export declare function GET(request: Request): Promise<Response>;
export declare function POST(request: Request, context?: RouteContext): Promise<Response>;
export {};

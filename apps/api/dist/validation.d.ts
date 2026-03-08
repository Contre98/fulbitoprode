import type { z, ZodTypeAny } from "zod";
export declare class RequestBodyValidationError extends Error {
    status: number;
    constructor(message: string, status?: number);
}
export declare function parseJsonBody<TSchema extends ZodTypeAny>(request: Request, schema: TSchema): Promise<z.infer<TSchema>>;

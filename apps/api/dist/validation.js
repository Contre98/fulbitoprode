export class RequestBodyValidationError extends Error {
    status;
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}
export async function parseJsonBody(request, schema) {
    let payload;
    try {
        payload = await request.json();
    }
    catch {
        throw new RequestBodyValidationError("Invalid payload", 400);
    }
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
        const firstMessage = parsed.error.issues[0]?.message?.trim() || "Invalid payload";
        throw new RequestBodyValidationError(firstMessage, 400);
    }
    return parsed.data;
}

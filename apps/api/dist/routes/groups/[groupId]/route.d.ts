interface RouteContext {
    params: Promise<{
        groupId: string;
    }>;
}
export declare function DELETE(request: Request, context: RouteContext): Promise<Response>;
export declare function PATCH(request: Request, context: RouteContext): Promise<Response>;
export {};

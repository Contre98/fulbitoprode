interface Params {
    params: Promise<{
        groupId: string;
    }>;
}
export declare function POST(request: Request, context: Params): Promise<Response>;
export {};

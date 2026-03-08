import { getSessionPocketBaseTokenFromRequest, getSessionUserIdFromRequest } from "./request-auth";
export function getApiSession(request) {
    const userId = getSessionUserIdFromRequest(request);
    const pbToken = getSessionPocketBaseTokenFromRequest(request);
    if (!userId || !pbToken) {
        return null;
    }
    return { userId, pbToken };
}
export function unauthorizedJson() {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
            "content-type": "application/json; charset=utf-8"
        }
    });
}

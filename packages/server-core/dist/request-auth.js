import { verifyAccessToken } from "./session";
export function getBearerTokenFromRequest(request) {
    const header = request.headers.get("authorization")?.trim() || "";
    if (!header) {
        return null;
    }
    const [scheme, token] = header.split(/\s+/, 2);
    if (!scheme || !token) {
        return null;
    }
    if (scheme.toLowerCase() !== "bearer") {
        return null;
    }
    return token.trim() || null;
}
function getAccessTokenFromRequest(request) {
    return getBearerTokenFromRequest(request);
}
export function getSessionUserIdFromRequest(request) {
    const token = getAccessTokenFromRequest(request);
    const access = verifyAccessToken(token);
    return access?.uid ?? null;
}
export function getSessionPocketBaseTokenFromRequest(request) {
    const token = getAccessTokenFromRequest(request);
    const access = verifyAccessToken(token);
    return access?.pbt ?? null;
}

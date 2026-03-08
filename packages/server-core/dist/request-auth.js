import { getAccessCookieName, getRefreshCookieName, getSessionCookieName, verifyAccessToken, verifyRefreshToken, verifySessionToken } from "./session";
export function parseCookieHeader(cookieHeader) {
    if (!cookieHeader) {
        return {};
    }
    return cookieHeader
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean)
        .reduce((acc, item) => {
        const [key, ...rest] = item.split("=");
        if (!key || rest.length === 0) {
            return acc;
        }
        acc[key] = decodeURIComponent(rest.join("="));
        return acc;
    }, {});
}
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
    const bearer = getBearerTokenFromRequest(request);
    if (bearer) {
        return bearer;
    }
    const cookies = parseCookieHeader(request.headers.get("cookie"));
    return cookies[getAccessCookieName()] || cookies[getSessionCookieName()] || null;
}
export function getRefreshTokenFromRequest(request) {
    const cookies = parseCookieHeader(request.headers.get("cookie"));
    return cookies[getRefreshCookieName()] || null;
}
export function getSessionUserIdFromRequest(request) {
    const token = getAccessTokenFromRequest(request);
    const access = verifyAccessToken(token);
    if (access) {
        return access.uid;
    }
    const legacy = verifySessionToken(token);
    return legacy?.uid ?? null;
}
export function getSessionPocketBaseTokenFromRequest(request) {
    const token = getAccessTokenFromRequest(request);
    const access = verifyAccessToken(token);
    if (access) {
        return access.pbt;
    }
    const legacy = verifySessionToken(token);
    return legacy?.pbt ?? null;
}
export function getRefreshPayloadFromRequest(request) {
    return verifyRefreshToken(getRefreshTokenFromRequest(request));
}

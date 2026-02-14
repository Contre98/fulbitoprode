import { getSessionCookieName, verifySessionToken } from "@/lib/session";

function parseCookieHeader(cookieHeader: string | null) {
  if (!cookieHeader) {
    return {} as Record<string, string>;
  }

  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, item) => {
      const [key, ...rest] = item.split("=");
      if (!key || rest.length === 0) {
        return acc;
      }

      acc[key] = decodeURIComponent(rest.join("="));
      return acc;
    }, {});
}

export function getSessionUserIdFromRequest(request: Request): string | null {
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  const token = cookies[getSessionCookieName()];
  const payload = verifySessionToken(token);
  return payload?.uid ?? null;
}

export function getSessionPocketBaseTokenFromRequest(request: Request): string | null {
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  const token = cookies[getSessionCookieName()];
  const payload = verifySessionToken(token);
  return payload?.pbt ?? null;
}


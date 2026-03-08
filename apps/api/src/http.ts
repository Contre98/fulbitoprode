export interface JsonResponseInit extends ResponseInit {
  cookies?: string[];
}

function appendCookies(headers: Headers, cookies: string[] | undefined) {
  if (!cookies || cookies.length === 0) {
    return;
  }

  for (const cookie of cookies) {
    headers.append("set-cookie", cookie);
  }
}

export function jsonResponse(body: unknown, init: JsonResponseInit = {}) {
  const headers = new Headers(init.headers || {});
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json; charset=utf-8");
  }
  appendCookies(headers, init.cookies);

  return new Response(JSON.stringify(body), {
    ...init,
    headers
  });
}

interface CookieInput {
  name: string;
  value: string;
  maxAge?: number;
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
}

export function serializeCookie(input: CookieInput) {
  const parts = [`${input.name}=${encodeURIComponent(input.value)}`];
  parts.push(`Path=${input.path || "/"}`);

  if (typeof input.maxAge === "number") {
    parts.push(`Max-Age=${Math.max(0, Math.floor(input.maxAge))}`);
  }

  if (input.httpOnly !== false) {
    parts.push("HttpOnly");
  }

  if (input.secure) {
    parts.push("Secure");
  }

  parts.push(`SameSite=${(input.sameSite || "lax").replace(/^./, (ch) => ch.toUpperCase())}`);
  return parts.join("; ");
}

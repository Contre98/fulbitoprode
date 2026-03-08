import { serializeCookie } from "./http";
import {
  getAccessCookieName,
  getAccessTokenMaxAgeSeconds,
  getRefreshCookieName,
  getRefreshTokenMaxAgeSeconds,
  getSessionCookieName,
  getSessionMaxAgeSeconds
} from "@fulbito/server-core/session";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function authCookieHeaders(input: { accessToken: string; refreshToken: string; legacySessionToken: string }) {
  return [
    serializeCookie({
      name: getAccessCookieName(),
      value: input.accessToken,
      maxAge: getAccessTokenMaxAgeSeconds(),
      secure: isProduction()
    }),
    serializeCookie({
      name: getRefreshCookieName(),
      value: input.refreshToken,
      maxAge: getRefreshTokenMaxAgeSeconds(),
      secure: isProduction()
    }),
    serializeCookie({
      name: getSessionCookieName(),
      value: input.legacySessionToken,
      maxAge: getSessionMaxAgeSeconds(),
      secure: isProduction()
    })
  ];
}

export function clearAuthCookieHeaders() {
  return [
    serializeCookie({ name: getAccessCookieName(), value: "", maxAge: 0, secure: isProduction() }),
    serializeCookie({ name: getRefreshCookieName(), value: "", maxAge: 0, secure: isProduction() }),
    serializeCookie({ name: getSessionCookieName(), value: "", maxAge: 0, secure: isProduction() })
  ];
}

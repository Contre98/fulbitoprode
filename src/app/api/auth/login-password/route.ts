import { NextResponse } from "next/server";
import { loginWithPassword } from "@/lib/m3-repo";
import { enforceRateLimit, getRequesterFingerprint } from "@/lib/rate-limit";
import { createSessionToken, getSessionCookieName, getSessionMaxAgeSeconds } from "@/lib/session";

export async function POST(request: Request) {
  const clientKey = getRequesterFingerprint(request, "login:unknown");
  const rateLimit = enforceRateLimit(`auth:login:${clientKey}`, {
    limit: 20,
    windowMs: 15 * 60 * 1000
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds)
        }
      }
    );
  }

  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase() || "";
    const password = body.password || "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const { user, token } = await loginWithPassword(email, password);
    const response = NextResponse.json(
      {
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          favoriteTeam: user.favoriteTeam ?? null
        }
      },
      { status: 200 }
    );

    response.cookies.set({
      name: getSessionCookieName(),
      value: createSessionToken({ userId: user.id, pbToken: token }),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: getSessionMaxAgeSeconds()
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid credentials";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

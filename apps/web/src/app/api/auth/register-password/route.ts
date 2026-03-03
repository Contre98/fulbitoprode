import { NextResponse } from "next/server";
import { registerWithPassword } from "@/lib/m3-repo";
import { enforceRateLimit, getRequesterFingerprint } from "@/lib/rate-limit";
import { createSessionToken, getSessionCookieName, getSessionMaxAgeSeconds } from "@/lib/session";

export async function POST(request: Request) {
  const clientKey = getRequesterFingerprint(request, "register:unknown");
  const rateLimit = enforceRateLimit(`auth:register:${clientKey}`, {
    limit: 10,
    windowMs: 15 * 60 * 1000
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many registration attempts. Try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds)
        }
      }
    );
  }

  try {
    const body = (await request.json()) as { email?: string; password?: string; name?: string };
    const email = body.email?.trim().toLowerCase() || "";
    const password = body.password || "";
    const name = body.name?.trim() || undefined;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const { user, token } = await registerWithPassword({ email, password, name });
    const response = NextResponse.json(
      {
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username ?? null,
          favoriteTeam: user.favoriteTeam ?? null
        }
      },
      { status: 201 }
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
    const message = error instanceof Error ? error.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

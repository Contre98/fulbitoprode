import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionCookieName, verifySessionToken } from "@/lib/session";

export async function requireServerAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  const payload = verifySessionToken(token);

  if (!payload) {
    redirect("/auth");
  }

  return payload;
}

import { NextResponse } from "next/server";
import { getSessionPocketBaseTokenFromRequest, getSessionUserIdFromRequest } from "@/lib/request-auth";

export interface ApiSession {
  userId: string;
  pbToken: string;
}

export function getApiSession(request: Request): ApiSession | null {
  const userId = getSessionUserIdFromRequest(request);
  const pbToken = getSessionPocketBaseTokenFromRequest(request);
  if (!userId || !pbToken) {
    return null;
  }
  return { userId, pbToken };
}

export function unauthorizedJson() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

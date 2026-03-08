import { NextResponse } from "next/server";
import { probePocketBase } from "@/lib/pocketbase";

export async function GET() {
  const probe = await probePocketBase();
  const status = probe.ok ? 200 : 503;
  return NextResponse.json(probe, { status });
}

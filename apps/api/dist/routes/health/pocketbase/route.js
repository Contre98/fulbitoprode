import { jsonResponse } from "#http";
import { probePocketBase } from "@fulbito/server-core/pocketbase";
export async function GET() {
    const probe = await probePocketBase();
    const status = probe.ok ? 200 : 503;
    return jsonResponse(probe, { status });
}

import { getPocketBaseUrl } from "@/lib/env";

export interface PocketBaseConfig {
  configured: boolean;
  url: string;
}

export function getPocketBaseConfig(): PocketBaseConfig {
  const url = getPocketBaseUrl();

  return {
    configured: Boolean(url),
    url
  };
}

export async function probePocketBase() {
  const config = getPocketBaseConfig();
  if (!config.configured) {
    return {
      configured: false,
      ok: false,
      status: null as number | null,
      latencyMs: null as number | null,
      error: "PocketBase URL is not configured (set POCKETBASE_URL or PB_URL)"
    };
  }

  const startedAt = Date.now();

  try {
    const response = await fetch(`${config.url}/api/health`, {
      method: "GET",
      cache: "no-store"
    });

    return {
      configured: true,
      ok: response.ok,
      status: response.status,
      latencyMs: Date.now() - startedAt,
      error: response.ok ? undefined : `PocketBase returned ${response.status}`
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown PocketBase error";
    return {
      configured: true,
      ok: false,
      status: null as number | null,
      latencyMs: Date.now() - startedAt,
      error: message
    };
  }
}

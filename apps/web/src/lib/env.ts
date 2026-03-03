function readFirstNonEmpty(values: Array<string | undefined>) {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return "";
}

function normalizeUrl(value: string) {
  return value.replace(/\/$/, "");
}

export function getPocketBaseUrl() {
  return normalizeUrl(
    readFirstNonEmpty([
      process.env.POCKETBASE_URL,
      process.env.PB_URL,
      process.env.NEXT_PUBLIC_PB_URL
    ])
  );
}

export function getSessionSecret() {
  const secret = readFirstNonEmpty([process.env.SESSION_SECRET]);
  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production.");
  }

  return "local-development-session-secret";
}

export function getHealthcheckToken() {
  return readFirstNonEmpty([process.env.HEALTHCHECK_TOKEN]) || null;
}

export function getFootballProviderCoreConfig() {
  const baseUrl = readFirstNonEmpty([process.env.API_FOOTBALL_BASE_URL, process.env.FOOTBALL_API_BASE_URL]);
  const apiKey = readFirstNonEmpty([process.env.API_FOOTBALL_KEY, process.env.FOOTBALL_API_KEY]);
  if (!baseUrl || !apiKey) {
    return null;
  }

  return {
    baseUrl: normalizeUrl(baseUrl),
    apiKey,
    prefersApiSports: Boolean(process.env.API_FOOTBALL_KEY?.trim())
  };
}

function normalizeUrl(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function readConfiguredApiBaseUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (fromEnv) {
    return normalizeUrl(fromEnv);
  }

  const fromTestGlobal =
    typeof globalThis === "object" &&
    globalThis &&
    "__FULBITO_TEST_API_BASE_URL__" in globalThis &&
    typeof (globalThis as { __FULBITO_TEST_API_BASE_URL__?: unknown }).__FULBITO_TEST_API_BASE_URL__ === "string"
      ? (globalThis as { __FULBITO_TEST_API_BASE_URL__?: string }).__FULBITO_TEST_API_BASE_URL__?.trim()
      : undefined;

  if (fromTestGlobal) {
    return normalizeUrl(fromTestGlobal);
  }

  return null;
}

export function getOptionalApiBaseUrl() {
  return readConfiguredApiBaseUrl();
}

export function getRequiredApiBaseUrl() {
  const baseUrl = readConfiguredApiBaseUrl();
  if (baseUrl) {
    return baseUrl;
  }

  throw new Error(
    "EXPO_PUBLIC_API_BASE_URL is not configured. Create apps/mobile/.env.local with EXPO_PUBLIC_API_BASE_URL=http://localhost:3000"
  );
}

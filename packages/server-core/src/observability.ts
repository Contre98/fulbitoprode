function safeJson(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return "{}";
  }
}

export function logServerEvent(event: string, payload?: Record<string, unknown>) {
  const context = payload ? ` ${safeJson(payload)}` : "";
  console.info(`[obs][server] ${event}${context}`);
}

export function trackClientEvent(event: string, payload?: Record<string, unknown>) {
  const context = payload ? ` ${safeJson(payload)}` : "";
  console.info(`[obs][client] ${event}${context}`);
}

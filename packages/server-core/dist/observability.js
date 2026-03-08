function safeJson(value) {
    try {
        return JSON.stringify(value);
    }
    catch {
        return "{}";
    }
}
export function logServerEvent(event, payload) {
    const context = payload ? ` ${safeJson(payload)}` : "";
    console.info(`[obs][server] ${event}${context}`);
}
export function trackClientEvent(event, payload) {
    const context = payload ? ` ${safeJson(payload)}` : "";
    console.info(`[obs][client] ${event}${context}`);
}

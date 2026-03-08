import AsyncStorage from "@react-native-async-storage/async-storage";

export interface FallbackFailure {
  scope: string;
  message: string;
  happenedAt: string;
}

const HISTORY_STORAGE_KEY = "fulbito.mobile.fallbackFailureHistory";
const HISTORY_LIMIT = 10;

let currentFailure: FallbackFailure | null = null;
const listeners = new Set<(failure: FallbackFailure | null) => void>();
let history: FallbackFailure[] = [];
const historyListeners = new Set<(entries: FallbackFailure[]) => void>();

function notify() {
  listeners.forEach((listener) => listener(currentFailure));
}

function notifyHistory() {
  historyListeners.forEach((listener) => listener(history));
}

function pushHistory(entry: FallbackFailure) {
  history = [entry, ...history].slice(0, HISTORY_LIMIT);
  notifyHistory();
}

async function persistHistory() {
  if (!__DEV__) {
    return;
  }
  try {
    await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Ignore diagnostics persistence failures.
  }
}

void (async () => {
  if (!__DEV__) {
    return;
  }
  try {
    const raw = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return;
    }
    const safeEntries = parsed.filter((item): item is FallbackFailure => {
      if (!item || typeof item !== "object") {
        return false;
      }
      const candidate = item as Record<string, unknown>;
      return typeof candidate.scope === "string" && typeof candidate.message === "string" && typeof candidate.happenedAt === "string";
    });
    history = safeEntries.slice(0, HISTORY_LIMIT);
    notifyHistory();
  } catch {
    // Ignore diagnostics history hydration failures.
  }
})();

export function getFallbackFailure() {
  return currentFailure;
}

export function getFallbackHistory() {
  return history;
}

export function subscribeFallbackFailure(listener: (failure: FallbackFailure | null) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function subscribeFallbackHistory(listener: (entries: FallbackFailure[]) => void) {
  historyListeners.add(listener);
  return () => {
    historyListeners.delete(listener);
  };
}

export function reportFallbackFailure(scope: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  const nextFailure = {
    scope,
    message,
    happenedAt: new Date().toISOString()
  };
  currentFailure = nextFailure;
  if (__DEV__) {
    pushHistory(nextFailure);
    void persistHistory();
  }
  notify();
}

export function clearFallbackFailure() {
  if (currentFailure === null) {
    return;
  }
  currentFailure = null;
  notify();
}

export function clearFallbackHistory() {
  if (history.length === 0) {
    return;
  }
  history = [];
  notifyHistory();
  if (__DEV__) {
    void AsyncStorage.removeItem(HISTORY_STORAGE_KEY);
  }
}

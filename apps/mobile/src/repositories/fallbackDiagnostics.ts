export interface FallbackFailure {
  scope: string;
  message: string;
  happenedAt: string;
}

let currentFailure: FallbackFailure | null = null;
const listeners = new Set<(failure: FallbackFailure | null) => void>();

function notify() {
  listeners.forEach((listener) => listener(currentFailure));
}

export function getFallbackFailure() {
  return currentFailure;
}

export function subscribeFallbackFailure(listener: (failure: FallbackFailure | null) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function reportFallbackFailure(scope: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  currentFailure = {
    scope,
    message,
    happenedAt: new Date().toISOString()
  };
  notify();
}

export function clearFallbackFailure() {
  if (currentFailure === null) {
    return;
  }
  currentFailure = null;
  notify();
}

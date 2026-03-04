jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
  }
}));

type DiagnosticsModule = typeof import("@/repositories/fallbackDiagnostics");

function loadDiagnostics() {
  jest.resetModules();
  const AsyncStorage = require("@react-native-async-storage/async-storage").default as {
    getItem: jest.Mock;
    setItem: jest.Mock;
    removeItem: jest.Mock;
  };
  AsyncStorage.getItem.mockReset();
  AsyncStorage.setItem.mockReset();
  AsyncStorage.removeItem.mockReset();
  AsyncStorage.getItem.mockResolvedValue(null);
  const diagnostics = require("@/repositories/fallbackDiagnostics") as DiagnosticsModule;
  return { diagnostics, AsyncStorage };
}

describe("fallback diagnostics history", () => {
  it("keeps latest 10 repeated failures and persists history in dev mode", async () => {
    const { diagnostics, AsyncStorage } = loadDiagnostics();

    for (let index = 0; index < 12; index += 1) {
      diagnostics.reportFallbackFailure(`scope-${index}`, new Error(`HTTP ${500 + index}`));
    }
    await Promise.resolve();

    const history = diagnostics.getFallbackHistory();
    expect(history).toHaveLength(10);
    expect(history[0]).toEqual(expect.objectContaining({ scope: "scope-11", message: "HTTP 511" }));
    expect(history[9]).toEqual(expect.objectContaining({ scope: "scope-2", message: "HTTP 502" }));
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });

  it("hydrates only valid persisted entries and enforces history limit", async () => {
    const validEntries = Array.from({ length: 12 }, (_, idx) => ({
      scope: `persisted-${idx}`,
      message: `HTTP ${idx}`,
      happenedAt: `2026-03-04T00:${String(idx).padStart(2, "0")}:00.000Z`
    }));
    const persistedPayload = JSON.stringify([
      ...validEntries,
      { scope: 123, message: "bad", happenedAt: "x" }
    ]);

    jest.resetModules();
    const AsyncStorage = require("@react-native-async-storage/async-storage").default as {
      getItem: jest.Mock;
      setItem: jest.Mock;
      removeItem: jest.Mock;
    };
    AsyncStorage.getItem.mockReset();
    AsyncStorage.setItem.mockReset();
    AsyncStorage.removeItem.mockReset();
    AsyncStorage.getItem.mockResolvedValue(persistedPayload);

    const diagnostics = require("@/repositories/fallbackDiagnostics") as DiagnosticsModule;
    await Promise.resolve();
    await Promise.resolve();

    const history = diagnostics.getFallbackHistory();
    expect(history).toHaveLength(10);
    expect(history[0].scope).toBe("persisted-0");
    expect(history[9].scope).toBe("persisted-9");
  });

  it("notifies subscribers and clears persisted history", async () => {
    const { diagnostics, AsyncStorage } = loadDiagnostics();
    const listener = jest.fn();
    const unsubscribe = diagnostics.subscribeFallbackHistory(listener);

    diagnostics.reportFallbackFailure("auth.getSession", new Error("HTTP 500"));
    diagnostics.reportFallbackFailure("predictions.listPredictions", new Error("HTTP 503"));
    diagnostics.clearFallbackHistory();
    diagnostics.clearFallbackHistory();
    unsubscribe();

    expect(listener).toHaveBeenNthCalledWith(
      1,
      expect.arrayContaining([
        expect.objectContaining({ scope: "auth.getSession" })
      ])
    );
    expect(listener).toHaveBeenNthCalledWith(
      2,
      expect.arrayContaining([
        expect.objectContaining({ scope: "predictions.listPredictions" }),
        expect.objectContaining({ scope: "auth.getSession" })
      ])
    );
    expect(listener).toHaveBeenLastCalledWith([]);
    expect(AsyncStorage.removeItem).toHaveBeenCalledTimes(1);
  });

  it("only clears history for active subscribers across subscribe/unsubscribe cycles", () => {
    const { diagnostics, AsyncStorage } = loadDiagnostics();
    const listenerA = jest.fn();
    const unsubscribeA = diagnostics.subscribeFallbackHistory(listenerA);

    diagnostics.reportFallbackFailure("auth.getSession", new Error("HTTP 500"));
    unsubscribeA();

    const listenerB = jest.fn();
    const unsubscribeB = diagnostics.subscribeFallbackHistory(listenerB);
    diagnostics.clearFallbackHistory();
    diagnostics.reportFallbackFailure("groups.listMemberships", new Error("HTTP 503"));
    unsubscribeB();
    diagnostics.clearFallbackHistory();

    expect(listenerA).toHaveBeenCalledTimes(1);
    expect(listenerA).toHaveBeenNthCalledWith(
      1,
      expect.arrayContaining([expect.objectContaining({ scope: "auth.getSession" })])
    );
    expect(listenerB).toHaveBeenNthCalledWith(1, []);
    expect(listenerB).toHaveBeenNthCalledWith(
      2,
      expect.arrayContaining([expect.objectContaining({ scope: "groups.listMemberships" })])
    );
    expect(AsyncStorage.removeItem).toHaveBeenCalledTimes(2);
  });
});

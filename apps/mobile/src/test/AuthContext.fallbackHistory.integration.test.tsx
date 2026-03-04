import { Pressable, Text } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { AuthProvider, useAuth } from "@/state/AuthContext";
import { DataModeBadge } from "@/components/DataModeBadge";

type FailureEntry = {
  scope: string;
  message: string;
  happenedAt: string;
};

const mockFailureSubscribers = new Set<(failure: FailureEntry | null) => void>();
const mockHistorySubscribers = new Set<(entries: FailureEntry[]) => void>();

let mockCurrentFailure: FailureEntry | null = null;
let mockCurrentHistory: FailureEntry[] = [];

function emitFailure(nextFailure: FailureEntry | null) {
  mockCurrentFailure = nextFailure;
  mockFailureSubscribers.forEach((listener) => listener(nextFailure));
}

function emitHistory(nextHistory: FailureEntry[]) {
  mockCurrentHistory = nextHistory;
  mockHistorySubscribers.forEach((listener) => listener(nextHistory));
}

const mockedCanUseHttpSession = jest.fn();
const mockedClearFallbackHistory = jest.fn(() => {
  emitHistory([]);
});

jest.mock("@/repositories", () => ({
  authRepository: {
    getSession: jest.fn(),
    loginWithPassword: jest.fn(),
    registerWithPassword: jest.fn(),
    logout: jest.fn()
  }
}));

jest.mock("@/repositories/authBridgeState", () => ({
  canUseHttpSession: () => mockedCanUseHttpSession()
}));

jest.mock("@/repositories/fallbackDiagnostics", () => ({
  getFallbackFailure: () => mockCurrentFailure,
  getFallbackHistory: () => mockCurrentHistory,
  subscribeFallbackFailure: (listener: (failure: FailureEntry | null) => void) => {
    mockFailureSubscribers.add(listener);
    return () => mockFailureSubscribers.delete(listener);
  },
  subscribeFallbackHistory: (listener: (entries: FailureEntry[]) => void) => {
    mockHistorySubscribers.add(listener);
    return () => mockHistorySubscribers.delete(listener);
  },
  clearFallbackHistory: () => mockedClearFallbackHistory()
}));

function AuthProbe() {
  const { loading, fallbackHistory } = useAuth();
  return (
    <>
      <Text testID="auth-loading">{loading ? "loading" : "ready"}</Text>
      <Text testID="auth-fallback-count">{fallbackHistory.length}</Text>
      <Pressable testID="emit-history" onPress={() => emitHistory([{ scope: "fixture.list", message: "HTTP 503", happenedAt: "2026-03-04T00:05:00.000Z" }])}>
        <Text>emit</Text>
      </Pressable>
    </>
  );
}

describe("AuthContext fallback history integration", () => {
  beforeEach(() => {
    const mockedRepositories = jest.requireMock("@/repositories") as {
      authRepository: {
        getSession: jest.Mock;
        loginWithPassword: jest.Mock;
        registerWithPassword: jest.Mock;
        logout: jest.Mock;
      };
    };

    jest.clearAllMocks();
    mockFailureSubscribers.clear();
    mockHistorySubscribers.clear();
    mockCurrentFailure = {
      scope: "auth.getSession",
      message: "HTTP 500",
      happenedAt: "2026-03-04T00:00:00.000Z"
    };
    mockCurrentHistory = [
      {
        scope: "auth.getSession",
        message: "HTTP 500",
        happenedAt: "2026-03-04T00:00:00.000Z"
      }
    ];
    mockedCanUseHttpSession.mockReturnValue(false);
    mockedRepositories.authRepository.getSession.mockResolvedValue(null);
    mockedRepositories.authRepository.loginWithPassword.mockResolvedValue(null);
    mockedRepositories.authRepository.registerWithPassword.mockResolvedValue(null);
    mockedRepositories.authRepository.logout.mockResolvedValue(undefined);
  });

  it("hydrates persisted fallback diagnostics into AuthContext and updates badge/history through subscriptions", async () => {
    const screen = render(
      <AuthProvider>
        <DataModeBadge />
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-loading").props.children).toBe("ready");
    });

    expect(screen.getByText("Mock Fallback")).toBeTruthy();
    expect(screen.getAllByText(/auth\.getSession/).length).toBeGreaterThan(0);
    expect(screen.getByTestId("auth-fallback-count").props.children).toBe(1);

    fireEvent.press(screen.getByTestId("emit-history"));

    await waitFor(() => {
      expect(screen.getByText(/fixture\.list/)).toBeTruthy();
      expect(screen.getByTestId("auth-fallback-count").props.children).toBe(1);
    });

    fireEvent.press(screen.getByText("Limpiar historial"));

    await waitFor(() => {
      expect(mockedClearFallbackHistory).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("auth-fallback-count").props.children).toBe(0);
      expect(screen.queryByText("Limpiar historial")).toBeNull();
    });
  });
});

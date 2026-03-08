import { fireEvent, render } from "@testing-library/react-native";
import { DataModeBadge } from "@/components/DataModeBadge";
import { useAuth } from "@/state/AuthContext";

jest.mock("@/state/AuthContext", () => ({
  useAuth: jest.fn()
}));

const mockedUseAuth = useAuth as unknown as jest.Mock;

describe("DataModeBadge", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders HTTP session mode badge", () => {
    mockedUseAuth.mockReturnValue({
      loading: false,
      session: null,
      isAuthenticated: false,
      dataMode: "http",
      fallbackIssue: null,
      fallbackHistory: [],
      refresh: jest.fn(),
      login: jest.fn(),
      register: jest.fn(),
      requestPasswordReset: jest.fn(),
      logout: jest.fn(),
      retryHttpMode: jest.fn(),
      clearFallbackDiagnosticsHistory: jest.fn()
    });

    const screen = render(<DataModeBadge />);
    expect(screen.getByText("HTTP Session")).toBeTruthy();
    expect(screen.queryByText("Reintentar HTTP")).toBeNull();
  });

  it("renders mock fallback mode and retries http mode", () => {
    const retryHttpMode = jest.fn();
    const clearFallbackDiagnosticsHistory = jest.fn();
    mockedUseAuth.mockReturnValue({
      loading: false,
      session: null,
      isAuthenticated: false,
      dataMode: "mock",
      fallbackIssue: "leaderboard: HTTP 500",
      fallbackHistory: [
        {
          scope: "auth.getSession",
          message: "HTTP 500",
          happenedAt: "2026-03-04T00:00:00.000Z"
        }
      ],
      refresh: jest.fn(),
      login: jest.fn(),
      register: jest.fn(),
      requestPasswordReset: jest.fn(),
      logout: jest.fn(),
      retryHttpMode,
      clearFallbackDiagnosticsHistory
    });

    const screen = render(<DataModeBadge />);
    fireEvent.press(screen.getByText("Reintentar HTTP"));
    fireEvent.press(screen.getByText("Limpiar historial"));

    expect(screen.getByText("Mock Fallback")).toBeTruthy();
    expect(screen.getByText(/auth\.getSession/)).toBeTruthy();
    expect(retryHttpMode).toHaveBeenCalledTimes(1);
    expect(clearFallbackDiagnosticsHistory).toHaveBeenCalledTimes(1);
  });
});

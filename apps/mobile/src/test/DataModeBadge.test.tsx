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
      refresh: jest.fn(),
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      retryHttpMode: jest.fn()
    });

    const screen = render(<DataModeBadge />);
    expect(screen.getByText("HTTP Session")).toBeTruthy();
    expect(screen.queryByText("Reintentar HTTP")).toBeNull();
  });

  it("renders mock fallback mode and retries http mode", () => {
    const retryHttpMode = jest.fn();
    mockedUseAuth.mockReturnValue({
      loading: false,
      session: null,
      isAuthenticated: false,
      dataMode: "mock",
      fallbackIssue: "leaderboard: HTTP 500",
      refresh: jest.fn(),
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      retryHttpMode
    });

    const screen = render(<DataModeBadge />);
    fireEvent.press(screen.getByText("Reintentar HTTP"));

    expect(screen.getByText("Mock Fallback")).toBeTruthy();
    expect(retryHttpMode).toHaveBeenCalledTimes(1);
  });
});

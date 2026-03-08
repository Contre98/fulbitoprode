import { fireEvent, render } from "@testing-library/react-native";
import { AjustesScreen } from "@/screens/AjustesScreen";
import { useAuth } from "@/state/AuthContext";

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack
  })
}));

jest.mock("@/state/AuthContext", () => ({
  useAuth: jest.fn()
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 })
}));

const mockedUseAuth = useAuth as unknown as jest.Mock;

describe("AjustesScreen actions", () => {
  const logout = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      dataMode: "mock",
      fallbackIssue: null,
      fallbackHistory: [],
      session: {
        user: { id: "u-1", email: "test@example.com", name: "Usuario Test" },
        memberships: []
      },
      refresh: jest.fn(),
      login: jest.fn(),
      register: jest.fn(),
      requestPasswordReset: jest.fn(),
      logout,
      retryHttpMode: jest.fn(),
      clearFallbackDiagnosticsHistory: jest.fn()
    });
  });

  it("navigates to Perfil from account section", () => {
    const screen = render(<AjustesScreen />);
    fireEvent.press(screen.getByText("Mi Perfil"));
    expect(mockNavigate).toHaveBeenCalledWith("Perfil");
  });

  it("triggers logout from account section", () => {
    const screen = render(<AjustesScreen />);
    fireEvent.press(screen.getByText("Cerrar sesión"));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("renders preferences rows and navigates to notifications", () => {
    const screen = render(<AjustesScreen />);
    expect(screen.getByText("Tema")).toBeTruthy();
    expect(screen.getByText("Próximamente")).toBeTruthy();
    expect(screen.getByText("Notificaciones")).toBeTruthy();
    fireEvent.press(screen.getByText("Notificaciones"));
    expect(mockNavigate).toHaveBeenCalledWith("Notificaciones");
  });
});

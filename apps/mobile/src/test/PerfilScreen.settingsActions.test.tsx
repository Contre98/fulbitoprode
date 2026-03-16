import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { PerfilScreen } from "@/screens/PerfilScreen";
import { authRepository, notificationsRepository, profileRepository } from "@/repositories";
import { useAuth } from "@/state/AuthContext";
import { useAppDialog } from "@/state/AppDialogContext";

jest.mock("react-native-reanimated", () => {
  const reanimated = require("react-native-reanimated/mock");
  return {
    ...reanimated,
    useReducedMotion: () => false,
    runOnJS: () => () => undefined
  };
});

jest.mock("@/repositories", () => ({
  authRepository: {
    changePassword: jest.fn(),
    deleteAccount: jest.fn()
  },
  profileRepository: {
    updateProfile: jest.fn()
  },
  notificationsRepository: {
    getPreferences: jest.fn(),
    updatePreferences: jest.fn()
  }
}));

jest.mock("@/state/AuthContext", () => ({
  useAuth: jest.fn()
}));

jest.mock("@/state/AppDialogContext", () => ({
  useAppDialog: jest.fn()
}));

jest.mock("@/state/ThemePreferenceContext", () => ({
  ThemePreference: { light: "light", dark: "dark" },
  useThemePreference: () => ({
    themePreference: "light",
    setThemePreference: jest.fn()
  })
}));

jest.mock("@/theme/useThemeColors", () => ({
  useThemeColors: () => ({
    bg: "#fff",
    panel: "#fff",
    border: "#ddd",
    borderMuted: "#ddd",
    text: "#111",
    textSecondary: "#666",
    textSoft: "#999",
    textInverse: "#fff",
    textMuted: "#999",
    iconStrong: "#111",
    primary: "#00a",
    primaryStrong: "#008",
    primarySoftAlt: "#dfe4ff",
    primaryDeep: "#004",
    dangerAccent: "#d00",
    dangerTint: "#fee",
    dangerSurface: "#fee",
    successDeep: "#070",
    surface: "#fff",
    surfaceMuted: "#f7f7f7",
    overlayStrong: "rgba(0,0,0,0.35)",
    textGray: "#666",
    textTitle: "#111",
    textMutedAlt: "#666"
  })
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    navigate: jest.fn()
  })
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 })
}));

jest.mock("expo-constants", () => ({
  expoConfig: {
    version: "1.0.0"
  }
}));

const mockedProfileUpdate = profileRepository.updateProfile as unknown as jest.Mock;
const mockedChangePassword = authRepository.changePassword as unknown as jest.Mock;
const mockedDeleteAccount = authRepository.deleteAccount as unknown as jest.Mock;
const mockedGetPreferences = notificationsRepository.getPreferences as unknown as jest.Mock;
const mockedUpdatePreferences = notificationsRepository.updatePreferences as unknown as jest.Mock;
const mockedUseAuth = useAuth as unknown as jest.Mock;
const mockedUseAppDialog = useAppDialog as unknown as jest.Mock;

function pressRow(screen: ReturnType<typeof render>, label: string) {
  fireEvent.press(screen.getAllByText(label)[0]);
}

describe("Perfil settings actions", () => {
  const logout = jest.fn().mockResolvedValue(undefined);
  const updateSessionUser = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      session: {
        user: {
          id: "u-1",
          email: "qa@example.com",
          name: "QA User"
        },
        memberships: []
      },
      logout,
      updateSessionUser
    });
    mockedGetPreferences.mockResolvedValue({ reminders: true, results: true, social: true });
    mockedUpdatePreferences.mockResolvedValue({ reminders: true, results: true, social: true });

    mockedUseAppDialog.mockReturnValue({
      alert: (_title: string, _message: string, actions?: Array<{ text: string; style?: string; onPress?: () => void }>) => {
        const destructiveAction = actions?.find((action) => action.style === "destructive");
        if (destructiveAction?.onPress) {
          destructiveAction.onPress();
        }
      }
    });
  });

  it("updates nombre", async () => {
    mockedProfileUpdate.mockResolvedValue({ name: "Nuevo Nombre", email: "qa@example.com" });
    const screen = render(<PerfilScreen />);

    pressRow(screen, "Nombre");
    fireEvent.changeText(screen.getByPlaceholderText("Tu nombre"), "Nuevo Nombre");
    fireEvent.press(screen.getByText("Guardar"));

    await waitFor(() => {
      expect(mockedProfileUpdate).toHaveBeenCalledWith({ name: "Nuevo Nombre" });
      expect(updateSessionUser).toHaveBeenCalledWith({ name: "Nuevo Nombre" });
    });
  });

  it("updates email", async () => {
    mockedProfileUpdate.mockResolvedValue({ name: "QA User", email: "nuevo@example.com" });
    const screen = render(<PerfilScreen />);

    pressRow(screen, "Email");
    fireEvent.changeText(screen.getByPlaceholderText("tu@email.com"), "nuevo@example.com");
    fireEvent.press(screen.getByText("Guardar"));

    await waitFor(() => {
      expect(mockedProfileUpdate).toHaveBeenCalledWith({ email: "nuevo@example.com" });
      expect(updateSessionUser).toHaveBeenCalledWith({ email: "nuevo@example.com" });
    });
  });

  it("updates contraseña", async () => {
    mockedChangePassword.mockResolvedValue({ ok: true });
    const screen = render(<PerfilScreen />);

    pressRow(screen, "Contraseña");
    fireEvent.changeText(screen.getByPlaceholderText("Nueva contraseña"), "supersecret");
    fireEvent.changeText(screen.getByPlaceholderText("Repetir contraseña"), "supersecret");
    fireEvent.press(screen.getByText("Guardar"));

    await waitFor(() => {
      expect(mockedChangePassword).toHaveBeenCalledWith({ password: "supersecret" });
    });
  });

  it("deletes account and logs out", async () => {
    mockedDeleteAccount.mockResolvedValue({ ok: true });
    const screen = render(<PerfilScreen />);

    pressRow(screen, "Eliminar cuenta");
    fireEvent.changeText(screen.getByPlaceholderText("eliminar"), "eliminar");
    fireEvent.press(screen.getByText("Eliminar"));

    await waitFor(() => {
      expect(mockedDeleteAccount).toHaveBeenCalledTimes(1);
      expect(logout).toHaveBeenCalledTimes(1);
    });
  });
});

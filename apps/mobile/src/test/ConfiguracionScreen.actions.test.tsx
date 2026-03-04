import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfiguracionScreen } from "@/screens/ConfiguracionScreen";
import { groupsRepository } from "@/repositories";
import { useAuth } from "@/state/AuthContext";
import { useGroupSelection } from "@/state/GroupContext";

jest.mock("@/repositories", () => ({
  groupsRepository: {
    createGroup: jest.fn(),
    joinGroup: jest.fn()
  }
}));

jest.mock("@/state/AuthContext", () => ({
  useAuth: jest.fn()
}));

jest.mock("@/state/GroupContext", () => ({
  useGroupSelection: jest.fn()
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 })
}));

const mockedUseAuth = useAuth as unknown as jest.Mock;
const mockedUseGroupSelection = useGroupSelection as unknown as jest.Mock;
const mockedCreateGroup = groupsRepository.createGroup as unknown as jest.Mock;
const mockedJoinGroup = groupsRepository.joinGroup as unknown as jest.Mock;

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={client}>
      <ConfiguracionScreen />
    </QueryClientProvider>
  );
}

describe("ConfiguracionScreen actions", () => {
  const refresh = jest.fn();
  const logout = jest.fn();
  const setSelectedGroupId = jest.fn();

  beforeEach(() => {
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
      refresh,
      login: jest.fn(),
      register: jest.fn(),
      logout,
      retryHttpMode: jest.fn(),
      clearFallbackDiagnosticsHistory: jest.fn()
    });

    mockedUseGroupSelection.mockReturnValue({
      memberships: [
        {
          groupId: "g-1",
          groupName: "Grupo Amigos",
          leagueId: 128,
          leagueName: "Liga Profesional",
          competitionStage: "apertura",
          season: "2026",
          role: "owner",
          joinedAt: "2026-01-01T00:00:00.000Z"
        }
      ],
      selectedGroupId: "g-1",
      setSelectedGroupId
    });

    mockedCreateGroup.mockResolvedValue({ id: "g-2", name: "Grupo Nuevo" });
    mockedJoinGroup.mockResolvedValue({ id: "g-3", name: "Grupo Unido" });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("shows validation message when creating group with empty name", async () => {
    const screen = renderScreen();

    const createButton = screen.getByText("+");
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(screen.getByText("Ingresá un nombre de grupo.")).toBeTruthy();
    });
    expect(mockedCreateGroup).not.toHaveBeenCalled();
  });

  it("creates group and refreshes memberships", async () => {
    const screen = renderScreen();

    fireEvent.changeText(screen.getByPlaceholderText("Nombre del nuevo grupo"), "Grupo Nuevo");
    fireEvent.press(screen.getByText("+"));

    await waitFor(() => {
      expect(mockedCreateGroup).toHaveBeenCalledWith({
        name: "Grupo Nuevo",
        competitionStage: "apertura",
        competitionName: "Liga Profesional",
        competitionKey: "argentina-128",
        leagueId: 128,
        season: "2026"
      });
    });

    await waitFor(() => {
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(setSelectedGroupId).toHaveBeenCalledWith("g-2");
      expect(screen.getByText("Grupo creado correctamente.")).toBeTruthy();
    });
  });

  it("joins group and refreshes memberships", async () => {
    const screen = renderScreen();

    fireEvent.press(screen.getByText("Unirse"));
    fireEvent.changeText(screen.getByPlaceholderText("Código de invitación"), "ABC-123");
    fireEvent.press(screen.getByText("Unirse al grupo"));

    await waitFor(() => {
      expect(mockedJoinGroup).toHaveBeenCalledWith({ codeOrToken: "ABC-123" });
    });

    await waitFor(() => {
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(setSelectedGroupId).toHaveBeenCalledWith("g-3");
      expect(screen.getByText("Te uniste al grupo correctamente.")).toBeTruthy();
    });
  });

  it("shows create-group error message when repository rejects", async () => {
    mockedCreateGroup.mockRejectedValueOnce(new Error("HTTP 500"));
    const screen = renderScreen();

    fireEvent.changeText(screen.getByPlaceholderText("Nombre del nuevo grupo"), "Grupo Fallido");
    fireEvent.press(screen.getByText("+"));

    await waitFor(() => {
      expect(screen.getByText("No se pudo crear el grupo. Reintentá.")).toBeTruthy();
    });
    expect(refresh).not.toHaveBeenCalled();
    expect(setSelectedGroupId).not.toHaveBeenCalled();
  });

  it("shows join-group error message when repository rejects", async () => {
    mockedJoinGroup.mockRejectedValueOnce(new Error("HTTP 400"));
    const screen = renderScreen();

    fireEvent.press(screen.getByText("Unirse"));
    fireEvent.changeText(screen.getByPlaceholderText("Código de invitación"), "BAD-CODE");
    fireEvent.press(screen.getByText("Unirse al grupo"));

    await waitFor(() => {
      expect(screen.getByText("No se pudo unir al grupo. Revisá el código e intentá otra vez.")).toBeTruthy();
    });
    expect(refresh).not.toHaveBeenCalled();
    expect(setSelectedGroupId).not.toHaveBeenCalled();
  });
});

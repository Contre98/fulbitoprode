import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Share } from "react-native";
import { ConfiguracionScreen } from "@/screens/ConfiguracionScreen";
import { groupsRepository } from "@/repositories";
import { useAuth } from "@/state/AuthContext";
import { useGroupSelection } from "@/state/GroupContext";

jest.mock("@/repositories", () => ({
  groupsRepository: {
    createGroup: jest.fn(),
    joinGroup: jest.fn(),
    updateGroupName: jest.fn(),
    listMembers: jest.fn(),
    updateMemberRole: jest.fn(),
    removeMember: jest.fn(),
    leaveGroup: jest.fn(),
    deleteGroup: jest.fn(),
    getInvite: jest.fn(),
    refreshInvite: jest.fn()
  }
}));

jest.mock("@/state/AuthContext", () => ({
  useAuth: jest.fn()
}));

jest.mock("@/state/GroupContext", () => ({
  useGroupSelection: jest.fn()
}));

jest.mock("@/state/PendingInviteContext", () => ({
  usePendingInvite: () => ({
    hydrated: true,
    pendingInviteToken: null,
    setPendingInviteToken: jest.fn().mockResolvedValue(undefined),
    clearPendingInviteToken: jest.fn().mockResolvedValue(undefined)
  })
}));

jest.mock("@react-navigation/native", () => ({
  useRoute: () => ({ params: {} })
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 })
}));

const mockedUseAuth = useAuth as unknown as jest.Mock;
const mockedUseGroupSelection = useGroupSelection as unknown as jest.Mock;
const mockedCreateGroup = groupsRepository.createGroup as unknown as jest.Mock;
const mockedJoinGroup = groupsRepository.joinGroup as unknown as jest.Mock;
const mockedListMembers = groupsRepository.listMembers as unknown as jest.Mock;
const mockedUpdateMemberRole = groupsRepository.updateMemberRole as unknown as jest.Mock;
const mockedRemoveMember = groupsRepository.removeMember as unknown as jest.Mock;
const mockedLeaveGroup = groupsRepository.leaveGroup as unknown as jest.Mock;
const mockedDeleteGroup = groupsRepository.deleteGroup as unknown as jest.Mock;
const mockedGetInvite = groupsRepository.getInvite as unknown as jest.Mock;
const mockedRefreshInvite = groupsRepository.refreshInvite as unknown as jest.Mock;
let mockedShare: jest.SpyInstance;

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
    mockedShare = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" } as never);
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
      requestPasswordReset: jest.fn(),
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
    mockedListMembers.mockResolvedValue({
      members: [
        { userId: "u-1", name: "Usuario Test", role: "owner", joinedAt: "2026-01-01T00:00:00.000Z" },
        { userId: "u-2", name: "Amigo Fulbito", role: "member", joinedAt: "2026-01-02T00:00:00.000Z" }
      ],
      viewerRole: "owner",
      canManage: true
    });
    mockedUpdateMemberRole.mockResolvedValue({
      ok: true,
      changed: true,
      member: { userId: "u-2", name: "Amigo Fulbito", role: "admin", joinedAt: "2026-01-02T00:00:00.000Z" }
    });
    mockedRemoveMember.mockResolvedValue({ ok: true });
    mockedLeaveGroup.mockResolvedValue({ ok: true, deletedGroup: false });
    mockedDeleteGroup.mockResolvedValue({ ok: true, warningRequired: false });
    mockedGetInvite.mockResolvedValue({
      invite: {
        code: "INV-001",
        token: "token-001",
        expiresAt: "2026-12-31T00:00:00.000Z"
      },
      canRefresh: true,
      inviteUrl: "https://fulbito.local/configuracion?invite=token-001"
    });
    mockedRefreshInvite.mockResolvedValue({
      ok: true,
      invite: {
        code: "INV-002",
        token: "token-002",
        expiresAt: "2026-12-31T00:00:00.000Z"
      }
    });
  });

  afterEach(() => {
    mockedShare.mockRestore();
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
      expect(screen.getByText("El servidor no pudo completar la solicitud. Intentá nuevamente en unos minutos.")).toBeTruthy();
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
      expect(screen.getByText("No se pudo procesar la solicitud. Revisá los datos e intentá nuevamente.")).toBeTruthy();
    });
    expect(refresh).not.toHaveBeenCalled();
    expect(setSelectedGroupId).not.toHaveBeenCalled();
  });

  it("loads and renders members in manage modal", async () => {
    const screen = renderScreen();
    fireEvent.press(screen.getByLabelText("Gestionar Grupo Amigos"));

    await waitFor(() => {
      expect(mockedListMembers).toHaveBeenCalledWith({ groupId: "g-1" });
      expect(screen.getByText("MIEMBROS")).toBeTruthy();
      expect(screen.getByText("Usuario Test")).toBeTruthy();
      expect(screen.getByText("Amigo Fulbito")).toBeTruthy();
      expect(screen.getAllByText("OWNER").length).toBeGreaterThan(0);
      expect(screen.getByText("MEMBER")).toBeTruthy();
    });
  });

  it("promotes a member to admin from manage modal", async () => {
    mockedListMembers
      .mockResolvedValueOnce({
        members: [
          { userId: "u-1", name: "Usuario Test", role: "owner", joinedAt: "2026-01-01T00:00:00.000Z" },
          { userId: "u-2", name: "Amigo Fulbito", role: "member", joinedAt: "2026-01-02T00:00:00.000Z" }
        ],
        viewerRole: "owner",
        canManage: true
      })
      .mockResolvedValueOnce({
        members: [
          { userId: "u-1", name: "Usuario Test", role: "owner", joinedAt: "2026-01-01T00:00:00.000Z" },
          { userId: "u-2", name: "Amigo Fulbito", role: "admin", joinedAt: "2026-01-02T00:00:00.000Z" }
        ],
        viewerRole: "owner",
        canManage: true
      });

    const screen = renderScreen();
    fireEvent.press(screen.getByLabelText("Gestionar Grupo Amigos"));

    await waitFor(() => {
      expect(screen.getByText("Amigo Fulbito")).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText("Promover Amigo Fulbito"));

    await waitFor(() => {
      expect(mockedUpdateMemberRole).toHaveBeenCalledWith({
        groupId: "g-1",
        userId: "u-2",
        role: "admin"
      });
      expect(screen.getByText("Amigo Fulbito ahora es admin.")).toBeTruthy();
    });
  });

  it("removes a member from manage modal", async () => {
    mockedListMembers
      .mockResolvedValueOnce({
        members: [
          { userId: "u-1", name: "Usuario Test", role: "owner", joinedAt: "2026-01-01T00:00:00.000Z" },
          { userId: "u-2", name: "Amigo Fulbito", role: "member", joinedAt: "2026-01-02T00:00:00.000Z" }
        ],
        viewerRole: "owner",
        canManage: true
      })
      .mockResolvedValueOnce({
        members: [{ userId: "u-1", name: "Usuario Test", role: "owner", joinedAt: "2026-01-01T00:00:00.000Z" }],
        viewerRole: "owner",
        canManage: true
      });

    const screen = renderScreen();
    fireEvent.press(screen.getByLabelText("Gestionar Grupo Amigos"));

    await waitFor(() => {
      expect(screen.getByText("Amigo Fulbito")).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText("Quitar Amigo Fulbito"));

    await waitFor(() => {
      expect(mockedRemoveMember).toHaveBeenCalledWith({
        groupId: "g-1",
        userId: "u-2"
      });
      expect(screen.getByText("Amigo Fulbito fue removido del grupo.")).toBeTruthy();
    });
  });

  it("requires confirmation before leaving a group", async () => {
    const screen = renderScreen();
    fireEvent.press(screen.getByLabelText("Gestionar Grupo Amigos"));

    await waitFor(() => {
      expect(screen.getByText("Salir del grupo")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Salir del grupo"));

    await waitFor(() => {
      expect(screen.getByText("Confirmar salida")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Confirmar"));

    await waitFor(() => {
      expect(mockedLeaveGroup).toHaveBeenCalledWith({ groupId: "g-1" });
      expect(refresh).toHaveBeenCalled();
      expect(screen.getByText("Saliste del grupo correctamente.")).toBeTruthy();
    });
  });

  it("requires confirmation before deleting a group", async () => {
    const screen = renderScreen();
    fireEvent.press(screen.getByLabelText("Gestionar Grupo Amigos"));

    await waitFor(() => {
      expect(screen.getByText("Eliminar grupo")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Eliminar grupo"));

    await waitFor(() => {
      expect(screen.getByText("Confirmar eliminación")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Confirmar"));

    await waitFor(() => {
      expect(mockedDeleteGroup).toHaveBeenCalledWith({ groupId: "g-1" });
      expect(refresh).toHaveBeenCalled();
      expect(screen.getByText("Grupo eliminado correctamente.")).toBeTruthy();
    });
  });

  it("loads invite details and shares invite from manage modal", async () => {
    const screen = renderScreen();
    fireEvent.press(screen.getByLabelText("Gestionar Grupo Amigos"));

    await waitFor(() => {
      expect(mockedGetInvite).toHaveBeenCalledWith({ groupId: "g-1" });
      expect(screen.getByText("Invitación activa: INV-001")).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText("Compartir invitación"));

    await waitFor(() => {
      expect(mockedShare).toHaveBeenCalledWith({
        message: "https://fulbito.local/configuracion?invite=token-001\nCódigo: INV-001",
        title: "Invitación Fulbito Prode"
      });
      expect(screen.getByText("Invitación compartida.")).toBeTruthy();
    });
  });

  it("copies invite to clipboard when available", async () => {
    const previousNavigator = (globalThis as { navigator?: unknown }).navigator;
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis, "navigator", {
      value: { clipboard: { writeText } },
      configurable: true
    });

    try {
      const screen = renderScreen();
      fireEvent.press(screen.getByLabelText("Gestionar Grupo Amigos"));

      await waitFor(() => {
        expect(screen.getByText("Invitación activa: INV-001")).toBeTruthy();
      });

      fireEvent.press(screen.getByLabelText("Copiar invitación"));

      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith("https://fulbito.local/configuracion?invite=token-001\nCódigo: INV-001");
        expect(screen.getByText("Invitación copiada.")).toBeTruthy();
      });
    } finally {
      Object.defineProperty(globalThis, "navigator", {
        value: previousNavigator,
        configurable: true
      });
    }
  });
});

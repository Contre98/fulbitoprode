import { fireEvent, waitFor } from "@testing-library/react-native";
import {
  mockAuthState,
  mockGroupSelectionState,
  mockPeriodState,
  mockedFixtureList,
  mockedGroupsCreate,
  mockedGroupsGetInvite,
  mockedGroupsJoin,
  mockedGroupsListMembers,
  mockedGroupsRemoveMember,
  mockedGroupsRefreshInvite,
  mockedGroupsUpdateMemberRole,
  mockedLeaderboardGet,
  mockedLeaderboardPayloadGet,
  mockedProfileGet,
  mockedProfileUpdate,
  mockedPredictionsList,
  mockedPredictionsSave,
  mockedUseAuth,
  mockedUseGroupSelection,
  mockedUsePeriod,
  renderAppNavigation
} from "./mobileSmokeTestHarness";

describe("Mobile E2E smoke tab-flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("covers Inicio -> Pronosticos autosave -> Configuracion create/join", async () => {
    const setSelectedGroupId = jest.fn();
    const refresh = jest.fn().mockResolvedValue(undefined);
    const logout = jest.fn().mockResolvedValue(undefined);

    mockedUseAuth.mockReturnValue(
      mockAuthState({
        refresh,
        logout
      })
    );

    mockedUseGroupSelection.mockReturnValue(
      mockGroupSelectionState({
        setSelectedGroupId
      })
    );

    mockedUsePeriod.mockReturnValue(
      mockPeriodState({
        options: [
          { id: 1, label: "Fecha 1" },
          { id: 2, label: "Fecha 2" }
        ]
      })
    );

    mockedFixtureList.mockResolvedValue([
      {
        id: "fx-arg-lan-upcoming",
        homeTeam: "Argentinos Juniors",
        awayTeam: "Lanus",
        kickoffAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: "upcoming"
      },
      {
        id: "fx-def-bel-final",
        homeTeam: "Defensa Y Justicia",
        awayTeam: "Belgrano Cordoba",
        kickoffAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: "final",
        score: {
          home: 1,
          away: 1
        }
      }
    ]);

    mockedPredictionsList.mockResolvedValue([]);
    mockedPredictionsSave.mockResolvedValue(undefined);
    mockedLeaderboardGet.mockResolvedValue([
      { userId: "u-1", displayName: "Usuario Fulbito", points: 18, rank: 1 }
    ]);
    mockedLeaderboardPayloadGet.mockResolvedValue({
      groupLabel: "Grupo Amigos",
      mode: "stats",
      period: "global",
      periodLabel: "Global acumulado",
      updatedAt: "2026-03-08T00:00:00.000Z",
      rows: [{ userId: "u-1", name: "Usuario Fulbito", rank: 1, predictions: 8, record: "6/2/0", points: 18 }],
      groupStats: null,
      stats: {
        summary: {
          memberCount: 1,
          scoredPredictions: 8,
          correctPredictions: 8,
          exactPredictions: 6,
          resultPredictions: 2,
          missPredictions: 0,
          accuracyPct: 100,
          totalPoints: 18,
          averageMemberPoints: 18,
          bestRound: null,
          worstRound: null,
          worldBenchmark: null
        },
        awards: [
          {
            id: "nostradamus",
            title: "NOSTRADAMUS",
            winnerName: "Usuario Fulbito",
            subtitle: "Mayor cantidad de plenos (6)"
          }
        ],
        historicalSeries: []
      }
    });
    mockedGroupsCreate
      .mockRejectedValueOnce(new Error("create failed"))
      .mockResolvedValueOnce({ id: "g-2", name: "Grupo QA" });
    mockedGroupsJoin
      .mockRejectedValueOnce(new Error("invalid invite"))
      .mockResolvedValueOnce({ id: "g-3", name: "Grupo Join" });
    mockedGroupsListMembers.mockResolvedValue({
      members: [
        { userId: "u-1", name: "QA User", role: "owner", joinedAt: "2026-01-01T00:00:00.000Z" },
        { userId: "u-2", name: "Amigo Fulbito", role: "member", joinedAt: "2026-01-02T00:00:00.000Z" }
      ],
      viewerRole: "owner",
      canManage: true
    });
    mockedGroupsUpdateMemberRole.mockResolvedValue({
      ok: true,
      changed: true,
      member: { userId: "u-2", name: "Amigo Fulbito", role: "admin", joinedAt: "2026-01-02T00:00:00.000Z" }
    });
    mockedGroupsRemoveMember.mockResolvedValue({ ok: true });
    mockedGroupsGetInvite.mockResolvedValue({
      invite: {
        code: "INV-001",
        token: "token-001",
        expiresAt: "2026-12-31T00:00:00.000Z"
      },
      canRefresh: true,
      inviteUrl: "https://fulbito.local/configuracion?invite=token-001"
    });
    mockedGroupsRefreshInvite.mockResolvedValue({
      ok: true,
      invite: {
        code: "INV-002",
        token: "token-002",
        expiresAt: "2026-12-31T00:00:00.000Z"
      }
    });
    mockedProfileGet.mockResolvedValue({
      stats: { totalPoints: 18, accuracyPct: 100, groups: 1 },
      recentActivity: [
        {
          id: "pred:1",
          type: "prediction",
          label: "Pronóstico: River Plate vs San Lorenzo",
          occurredAt: "2026-03-08T00:00:00.000Z",
          points: 3
        }
      ],
      updatedAt: "2026-03-08T00:00:00.000Z"
    });
    mockedProfileUpdate.mockResolvedValue({
      id: "u-1",
      name: "QA User Editado",
      username: "qa-user",
      email: "qa-editado@example.com",
      favoriteTeam: "River Plate"
    });

    const screen = renderAppNavigation();

    await waitFor(() => {
      expect(screen.getAllByText("Inicio").length).toBeGreaterThan(0);
      expect(screen.getByText("Próximos Partidos")).toBeTruthy();
    });

    fireEvent.press(screen.getAllByText("Posiciones")[0]);

    await waitFor(() => {
      expect(screen.getAllByText("Posiciones").length).toBeGreaterThan(0);
      expect(screen.getByText("Stats")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Stats"));

    await waitFor(() => {
      expect(screen.getAllByText("PREMIOS Y CASTIGOS").length).toBeGreaterThan(0);
    });

    fireEvent.press(screen.getAllByText("Posiciones")[0]);

    await waitFor(() => {
      expect(screen.getByText("PRED")).toBeTruthy();
    });

    fireEvent.press(screen.getAllByText("Pronósticos")[0]);

    await waitFor(() => {
      expect(screen.getByText("Por Jugar")).toBeTruthy();
      expect(screen.getByText("Jugados")).toBeTruthy();
    });

    const scoreInputs = screen.getAllByPlaceholderText("-");
    fireEvent.changeText(scoreInputs[0], "2");
    fireEvent.changeText(scoreInputs[1], "1");

    await waitFor(() => {
      expect(mockedPredictionsSave).toHaveBeenCalledWith({
        groupId: "g-1",
        fecha: 1,
        prediction: {
          fixtureId: "fx-arg-lan-upcoming",
          home: 2,
          away: 1
        }
      });
    }, { timeout: 2500 });

    fireEvent.press(screen.getByLabelText("Seleccionar grupo"));
    fireEvent.press(screen.getByText("Mi Perfil"));

    await waitFor(() => {
      expect(screen.getByText("ACTIVIDAD RECIENTE")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Editar"));
    fireEvent.changeText(screen.getByPlaceholderText("Tu nombre"), "QA User Editado");
    fireEvent.changeText(screen.getByPlaceholderText("usuario"), "qa-user");
    fireEvent.changeText(screen.getByPlaceholderText("email@ejemplo.com"), "qa-editado@example.com");
    fireEvent.press(screen.getByText("Guardar cambios"));

    await waitFor(() => {
      expect(mockedProfileUpdate).toHaveBeenCalledWith({
        name: "QA User Editado",
        username: "qa-user",
        email: "qa-editado@example.com"
      });
    });

    fireEvent.press(screen.getByText("←"));

    await waitFor(() => {
      expect(screen.getByText("Por Jugar")).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText("Seleccionar grupo"));
    fireEvent.press(screen.getByText("Ajustes"));

    await waitFor(() => {
      expect(screen.getByText("CUENTA")).toBeTruthy();
      expect(screen.getByText("PREFERENCIAS")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Cerrar sesión"));
    await waitFor(() => {
      expect(logout).toHaveBeenCalledTimes(1);
    });

    fireEvent.press(screen.getByText("←"));
    await waitFor(() => {
      expect(screen.getByText("Por Jugar")).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText("Seleccionar grupo"));
    fireEvent.press(screen.getByText("Administrar Grupos"));

    await waitFor(() => {
      expect(screen.getByText("Crear Grupo")).toBeTruthy();
    });

    fireEvent.changeText(screen.getByPlaceholderText("Nombre del nuevo grupo"), "Grupo QA");
    fireEvent.press(screen.getByText("+"));

    await waitFor(() => {
      expect(screen.getByText("No se pudo crear el grupo. Reintentá.")).toBeTruthy();
      expect(mockedGroupsCreate).toHaveBeenCalledWith({
        name: "Grupo QA",
        competitionStage: "apertura",
        competitionName: "Liga Profesional",
        competitionKey: "argentina-128",
        leagueId: 128,
        season: "2026"
      });
    });

    fireEvent.press(screen.getByText("+"));

    await waitFor(() => {
      expect(mockedGroupsCreate).toHaveBeenCalledTimes(2);
    });

    fireEvent.press(screen.getByText("Unirse"));
    fireEvent.press(screen.getByText("Unirse al grupo"));

    await waitFor(() => {
      expect(screen.getByText("Ingresá un código de invitación.")).toBeTruthy();
    });

    fireEvent.changeText(screen.getByPlaceholderText("Código de invitación"), "INV-123");
    fireEvent.press(screen.getByText("Unirse al grupo"));

    await waitFor(() => {
      expect(screen.getByText("No se pudo unir al grupo. Revisá el código e intentá otra vez.")).toBeTruthy();
      expect(mockedGroupsJoin).toHaveBeenCalledWith({ codeOrToken: "INV-123" });
    });

    fireEvent.press(screen.getByText("Unirse al grupo"));

    await waitFor(() => {
      expect(mockedGroupsJoin).toHaveBeenCalledTimes(2);
      expect(refresh).toHaveBeenCalled();
      expect(setSelectedGroupId).toHaveBeenCalled();
    });
  });
});

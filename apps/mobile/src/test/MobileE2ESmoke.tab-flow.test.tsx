import { fireEvent, waitFor } from "@testing-library/react-native";
import {
  mockAuthState,
  mockGroupSelectionState,
  mockPeriodState,
  mockedFixtureList,
  mockedGroupsCreate,
  mockedGroupsJoin,
  mockedLeaderboardGet,
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

  it("covers Inicio -> Pronosticos save -> Grupos create/join", async () => {
    const setSelectedGroupId = jest.fn();
    const refresh = jest.fn().mockResolvedValue(undefined);

    mockedUseAuth.mockReturnValue(
      mockAuthState({
        refresh
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
        id: "fx-upcoming-arg-lan",
        homeTeam: "Argentinos Juniors",
        awayTeam: "Lanus",
        kickoffAt: "2026-03-06T22:00:00.000Z",
        status: "upcoming"
      },
      {
        id: "fx-final-1-1-def-bel",
        homeTeam: "Defensa Y Justicia",
        awayTeam: "Belgrano Cordoba",
        kickoffAt: "2026-03-04T22:00:00.000Z",
        status: "final"
      }
    ]);

    mockedPredictionsList.mockResolvedValue([]);
    mockedPredictionsSave.mockResolvedValue(undefined);
    mockedLeaderboardGet.mockResolvedValue([
      { userId: "u-1", displayName: "Usuario Fulbito", points: 18, rank: 1 }
    ]);
    mockedGroupsCreate
      .mockRejectedValueOnce(new Error("create failed"))
      .mockResolvedValueOnce({ id: "g-2", name: "Grupo QA" });
    mockedGroupsJoin
      .mockRejectedValueOnce(new Error("invalid invite"))
      .mockResolvedValueOnce({ id: "g-3", name: "Grupo Join" });

    const screen = renderAppNavigation();

    await waitFor(() => {
      expect(screen.getAllByText("Inicio").length).toBeGreaterThan(0);
      expect(screen.getByText("Próximos Partidos")).toBeTruthy();
    });

    fireEvent.press(screen.getAllByText("Posiciones")[0]);

    await waitFor(() => {
      expect(screen.getByText("POSICIONES")).toBeTruthy();
      expect(screen.getByText("STATS")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("STATS"));

    await waitFor(() => {
      expect(screen.getAllByText("PREMIOS Y CASTIGOS").length).toBeGreaterThan(0);
    });

    fireEvent.press(screen.getByText("POSICIONES"));

    await waitFor(() => {
      expect(screen.getByText("PRED")).toBeTruthy();
    });

    fireEvent.press(screen.getAllByText("Pronósticos")[0]);

    await waitFor(() => {
      expect(screen.getByText("Guardar pronóstico")).toBeTruthy();
    });

    const scoreInputs = screen.getAllByPlaceholderText("-");
    fireEvent.changeText(scoreInputs[0], "2");
    fireEvent.changeText(scoreInputs[1], "1");
    fireEvent.press(screen.getByText("Guardar pronóstico"));

    await waitFor(() => {
      expect(mockedPredictionsSave).toHaveBeenCalledWith({
        groupId: "g-1",
        fecha: 1,
        prediction: {
          fixtureId: "fx-upcoming-arg-lan",
          home: 2,
          away: 1
        }
      });
    });

    fireEvent.press(screen.getAllByText("Grupos")[0]);

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

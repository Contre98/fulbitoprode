import { Pressable, Text } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PeriodProvider, usePeriod } from "@/state/PeriodContext";
import { useGroupSelection } from "@/state/GroupContext";

jest.mock("@/state/GroupContext", () => ({
  useGroupSelection: jest.fn()
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
  }
}));

const mockedUseGroupSelection = useGroupSelection as unknown as jest.Mock;
const mockedAsyncStorage = AsyncStorage as unknown as {
  getItem: jest.Mock;
  setItem: jest.Mock;
  removeItem: jest.Mock;
};

function PeriodProbe() {
  const { fecha, setFecha } = usePeriod();
  return (
    <>
      <Text testID="selected-fecha">{fecha}</Text>
      <Pressable testID="set-fecha-2" onPress={() => setFecha("2026-02")}>
        <Text>set fecha 2</Text>
      </Pressable>
    </>
  );
}

describe("PeriodContext persistence", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseGroupSelection.mockReturnValue({
      memberships: [
        {
          groupId: "g-1",
          groupName: "Grupo A",
          leagueId: 1,
          leagueName: "Liga",
          season: "2026",
          role: "member",
          joinedAt: "2026-01-01T00:00:00.000Z"
        }
      ],
      selectedGroupId: "g-1"
    });
  });

  it("hydrates fecha from storage and persists changes", async () => {
    mockedAsyncStorage.getItem.mockResolvedValue("2026-03");

    const screen = render(
      <PeriodProvider>
        <PeriodProbe />
      </PeriodProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("selected-fecha").props.children).toBe("2026-03");
    });

    fireEvent.press(screen.getByTestId("set-fecha-2"));

    await waitFor(() => {
      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith("fulbito.mobile.selectedFecha:g-1", "2026-02");
    });
  });
});

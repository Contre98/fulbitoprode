import { Pressable, Text } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GroupProvider, useGroupSelection } from "@/state/GroupContext";
import { useAuth } from "@/state/AuthContext";

jest.mock("@/state/AuthContext", () => ({
  useAuth: jest.fn()
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
  }
}));

const mockedUseAuth = useAuth as unknown as jest.Mock;
const mockedAsyncStorage = AsyncStorage as unknown as {
  getItem: jest.Mock;
  setItem: jest.Mock;
  removeItem: jest.Mock;
};

function GroupProbe() {
  const { selectedGroupId, setSelectedGroupId } = useGroupSelection();
  return (
    <>
      <Text testID="selected-group">{selectedGroupId ?? "none"}</Text>
      <Pressable testID="select-g2" onPress={() => setSelectedGroupId("g-2")}>
        <Text>select g2</Text>
      </Pressable>
    </>
  );
}

describe("GroupContext persistence", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      loading: false,
      session: {
        user: {
          id: "u-1",
          email: "test@fulbito.com",
          name: "Test User"
        },
        memberships: [
          {
            groupId: "g-1",
            groupName: "Grupo A",
            leagueId: 1,
            leagueName: "Liga",
            season: "2026",
            role: "member",
            joinedAt: "2026-01-01T00:00:00.000Z"
          },
          {
            groupId: "g-2",
            groupName: "Grupo B",
            leagueId: 1,
            leagueName: "Liga",
            season: "2026",
            role: "member",
            joinedAt: "2026-01-01T00:00:00.000Z"
          }
        ]
      }
    });
  });

  it("hydrates selected group from storage and persists updates", async () => {
    mockedAsyncStorage.getItem.mockResolvedValue("g-2");

    const screen = render(
      <GroupProvider>
        <GroupProbe />
      </GroupProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("selected-group").props.children).toBe("g-2");
    });

    fireEvent.press(screen.getByTestId("select-g2"));

    await waitFor(() => {
      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith("fulbito.mobile.selectedGroupId", "g-2");
    });
  });

  it("falls back to first membership when stored group is invalid", async () => {
    mockedAsyncStorage.getItem.mockResolvedValue("missing-group");

    const screen = render(
      <GroupProvider>
        <GroupProbe />
      </GroupProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("selected-group").props.children).toBe("g-1");
    });

    await waitFor(() => {
      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith("fulbito.mobile.selectedGroupId", "g-1");
    });
  });
});

import { fireEvent, render } from "@testing-library/react-native";
import { GroupSelector } from "@/components/GroupSelector";
import { useGroupSelection } from "@/state/GroupContext";

jest.mock("@/state/GroupContext", () => ({
  useGroupSelection: jest.fn()
}));

const mockedUseGroupSelection = useGroupSelection as unknown as jest.Mock;

describe("GroupSelector", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("updates selected group when user taps another group", () => {
    const setSelectedGroupId = jest.fn();
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
      ],
      selectedGroupId: "g-1",
      setSelectedGroupId
    });

    const screen = render(<GroupSelector />);
    fireEvent.press(screen.getByText("Grupo B"));

    expect(setSelectedGroupId).toHaveBeenCalledWith("g-2");
  });
});

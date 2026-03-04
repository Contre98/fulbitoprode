import { fireEvent, render } from "@testing-library/react-native";
import { FechaSelector } from "@/components/FechaSelector";
import { usePeriod } from "@/state/PeriodContext";

jest.mock("@/state/PeriodContext", () => ({
  usePeriod: jest.fn()
}));

const mockedUsePeriod = usePeriod as unknown as jest.Mock;

describe("FechaSelector", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("updates selected fecha when user taps another option", () => {
    const setFecha = jest.fn();
    mockedUsePeriod.mockReturnValue({
      fecha: "2026-01",
      options: [
        { id: "2026-01", label: "Fecha 1" },
        { id: "2026-02", label: "Fecha 2" }
      ],
      setFecha
    });

    const screen = render(<FechaSelector />);
    fireEvent.press(screen.getByText("Fecha 2"));

    expect(setFecha).toHaveBeenCalledWith("2026-02");
  });
});

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
    fireEvent.press(screen.getByTestId("fecha-next"));

    expect(setFecha).toHaveBeenCalledWith("2026-02");
  });

  it("supports a custom cycle value and options", () => {
    const setFecha = jest.fn();
    const onChange = jest.fn();
    mockedUsePeriod.mockReturnValue({
      fecha: "2026-01",
      options: [{ id: "2026-01", label: "Fecha 1" }],
      setFecha
    });

    const screen = render(
      <FechaSelector
        value="global"
        options={[
          { id: "global", label: "Global acumulado" },
          { id: "2026-01", label: "Fecha 1" }
        ]}
        onChange={onChange}
      />
    );

    fireEvent.press(screen.getByTestId("fecha-next"));
    expect(onChange).toHaveBeenCalledWith("2026-01");
    expect(setFecha).not.toHaveBeenCalled();
  });

  it("allows selecting a fecha from the dropdown menu", () => {
    const setFecha = jest.fn();
    mockedUsePeriod.mockReturnValue({
      fecha: "2026-01",
      options: [
        { id: "2026-01", label: "Fecha 1" },
        { id: "2026-02", label: "Fecha 2" },
        { id: "2026-03", label: "Fecha 3" }
      ],
      setFecha
    });

    const screen = render(<FechaSelector />);
    fireEvent.press(screen.getByTestId("fecha-dropdown-trigger"));
    fireEvent.press(screen.getByText("Fecha 3"));

    expect(setFecha).toHaveBeenCalledWith("2026-03");
  });

});

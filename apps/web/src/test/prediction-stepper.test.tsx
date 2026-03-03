import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { PredictionStepper } from "@/components/matches/PredictionStepper";

describe("PredictionStepper", () => {
  it("calls increment/decrement callbacks", () => {
    const onIncrement = vi.fn();
    const onDecrement = vi.fn();

    render(<PredictionStepper value={2} onIncrement={onIncrement} onDecrement={onDecrement} />);

    fireEvent.click(screen.getByRole("button", { name: "Incrementar" }));
    fireEvent.click(screen.getByRole("button", { name: "Decrementar" }));

    expect(onIncrement).toHaveBeenCalledTimes(1);
    expect(onDecrement).toHaveBeenCalledTimes(1);
  });

  it("clamps at min/max by disabling controls", () => {
    const onIncrement = vi.fn();
    const onDecrement = vi.fn();

    const { rerender } = render(
      <PredictionStepper value={99} max={99} onIncrement={onIncrement} onDecrement={onDecrement} />
    );

    expect(screen.getByRole("button", { name: "Incrementar" })).toBeDisabled();

    rerender(<PredictionStepper value={0} min={0} onIncrement={onIncrement} onDecrement={onDecrement} />);

    expect(screen.getByRole("button", { name: "Decrementar" })).toBeDisabled();
  });

  it("supports wheel scroll to cycle values", () => {
    const onIncrement = vi.fn();
    const onDecrement = vi.fn();

    render(<PredictionStepper value={10} onIncrement={onIncrement} onDecrement={onDecrement} />);

    const incrementButton = screen.getByRole("button", { name: "Incrementar" });
    const stepperRoot = incrementButton.parentElement as HTMLElement;

    fireEvent.wheel(stepperRoot, { deltaY: -20 });
    fireEvent.wheel(stepperRoot, { deltaY: 20 });

    expect(onIncrement).toHaveBeenCalledTimes(1);
    expect(onDecrement).toHaveBeenCalledTimes(1);
  });

  it("supports touch drag up and down to cycle values", () => {
    const onIncrement = vi.fn();
    const onDecrement = vi.fn();

    render(<PredictionStepper value={10} onIncrement={onIncrement} onDecrement={onDecrement} />);

    const incrementButton = screen.getByRole("button", { name: "Incrementar" });
    const stepperRoot = incrementButton.parentElement as HTMLElement;

    fireEvent.touchStart(stepperRoot, { touches: [{ clientY: 100 }] });
    fireEvent.touchMove(stepperRoot, { touches: [{ clientY: 80 }] });
    fireEvent.touchMove(stepperRoot, { touches: [{ clientY: 100 }] });
    fireEvent.touchEnd(stepperRoot);

    expect(onIncrement).toHaveBeenCalledTimes(1);
    expect(onDecrement).toHaveBeenCalledTimes(1);
  });
});

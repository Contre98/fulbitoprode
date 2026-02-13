"use client";

import { ChevronDown, ChevronUp } from "lucide-react";

interface PredictionStepperProps {
  value: number | null;
  onIncrement?: () => void;
  onDecrement?: () => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export function PredictionStepper({
  value,
  onIncrement,
  onDecrement,
  min = 0,
  max = 99,
  disabled = false
}: PredictionStepperProps) {
  const canIncrement = value === null || value < max;
  const canDecrement = value === null || value > min;

  return (
    <div className="flex h-12 w-[42px] flex-col items-center justify-between rounded-lg border border-[var(--border-light)] bg-black px-0 py-[3px]">
      <button
        type="button"
        aria-label="Incrementar"
        className="text-[var(--text-secondary)] transition-opacity hover:opacity-90 disabled:opacity-40"
        disabled={disabled || !canIncrement}
        onClick={onIncrement}
      >
        <ChevronUp size={12} strokeWidth={2.2} />
      </button>

      <span className="font-mono text-base font-semibold text-white">{value === null ? "-" : value}</span>

      <button
        type="button"
        aria-label="Decrementar"
        className="text-[var(--text-secondary)] transition-opacity hover:opacity-90 disabled:opacity-40"
        disabled={disabled || !canDecrement}
        onClick={onDecrement}
      >
        <ChevronDown size={12} strokeWidth={2.2} />
      </button>
    </div>
  );
}

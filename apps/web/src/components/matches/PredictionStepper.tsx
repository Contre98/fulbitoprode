"use client";

import { useRef } from "react";
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
  const dragAccumulatorRef = useRef(0);
  const dragLastYRef = useRef(0);
  const touchActiveRef = useRef(false);

  const stepThreshold = 18;

  const triggerIncrement = (count = 1) => {
    for (let index = 0; index < count; index += 1) {
      onIncrement?.();
    }
  };

  const triggerDecrement = (count = 1) => {
    for (let index = 0; index < count; index += 1) {
      onDecrement?.();
    }
  };

  const applyDeltaY = (deltaY: number) => {
    if (disabled || deltaY === 0) return;

    dragAccumulatorRef.current += deltaY;

    while (dragAccumulatorRef.current <= -stepThreshold) {
      dragAccumulatorRef.current += stepThreshold;
      triggerIncrement(1);
    }

    while (dragAccumulatorRef.current >= stepThreshold) {
      dragAccumulatorRef.current -= stepThreshold;
      triggerDecrement(1);
    }
  };

  return (
    <div
      className="flex w-[56px] flex-col items-center gap-1.5 touch-none"
      onWheel={(event) => {
        if (disabled) return;
        event.preventDefault();
        const steps = Math.max(1, Math.floor(Math.abs(event.deltaY) / stepThreshold));
        if (event.deltaY < 0) {
          triggerIncrement(steps);
        } else {
          triggerDecrement(steps);
        }
      }}
      onTouchStart={(event) => {
        if (disabled || event.touches.length === 0) return;
        touchActiveRef.current = true;
        dragAccumulatorRef.current = 0;
        dragLastYRef.current = event.touches[0].clientY;
      }}
      onTouchMove={(event) => {
        if (!touchActiveRef.current || event.touches.length === 0) return;
        const deltaY = event.touches[0].clientY - dragLastYRef.current;
        dragLastYRef.current = event.touches[0].clientY;
        applyDeltaY(deltaY);
      }}
      onTouchEnd={() => {
        touchActiveRef.current = false;
        dragAccumulatorRef.current = 0;
      }}
      onTouchCancel={() => {
        touchActiveRef.current = false;
        dragAccumulatorRef.current = 0;
      }}
    >
      <button
        type="button"
        aria-label="Incrementar"
        className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] active:scale-[0.98] disabled:opacity-40"
        disabled={disabled || !canIncrement}
        onClick={onIncrement}
      >
        <ChevronUp size={16} strokeWidth={2.5} />
      </button>

      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-1)]">
        <span className="text-[25px] leading-none font-black tracking-tighter text-[var(--text-primary)]">{value === null ? "-" : value}</span>
      </div>

      <button
        type="button"
        aria-label="Decrementar"
        className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] active:scale-[0.98] disabled:opacity-40"
        disabled={disabled || !canDecrement}
        onClick={onDecrement}
      >
        <ChevronDown size={16} strokeWidth={2.5} />
      </button>
    </div>
  );
}

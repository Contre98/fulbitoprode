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
  const dragActiveRef = useRef(false);
  const dragPointerIdRef = useRef<number | null>(null);
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
    if (disabled || deltaY === 0) {
      return;
    }
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

  const isInteractiveButtonTarget = (target: EventTarget | null) =>
    target instanceof Element && target.closest("button") !== null;

  return (
    <div
      className="flex w-[48px] flex-col items-center gap-1 touch-none"
      onWheel={(event) => {
        if (disabled) {
          return;
        }
        event.preventDefault();
        const steps = Math.max(1, Math.floor(Math.abs(event.deltaY) / stepThreshold));
        if (event.deltaY < 0) {
          triggerIncrement(steps);
          return;
        }
        triggerDecrement(steps);
      }}
      onPointerDown={(event) => {
        if (disabled) {
          return;
        }
        if (isInteractiveButtonTarget(event.target)) {
          return;
        }
        dragActiveRef.current = true;
        dragPointerIdRef.current = event.pointerId;
        dragAccumulatorRef.current = 0;
        dragLastYRef.current = event.clientY;
        if (typeof event.currentTarget.setPointerCapture === "function") {
          event.currentTarget.setPointerCapture(event.pointerId);
        }
      }}
      onPointerMove={(event) => {
        if (!dragActiveRef.current || dragPointerIdRef.current !== event.pointerId) {
          return;
        }
        const deltaY = event.clientY - dragLastYRef.current;
        dragLastYRef.current = event.clientY;
        applyDeltaY(deltaY);
      }}
      onPointerUp={(event) => {
        if (dragPointerIdRef.current === event.pointerId) {
          dragActiveRef.current = false;
          dragPointerIdRef.current = null;
          dragAccumulatorRef.current = 0;
        }
      }}
      onPointerCancel={(event) => {
        if (dragPointerIdRef.current === event.pointerId) {
          dragActiveRef.current = false;
          dragPointerIdRef.current = null;
          dragAccumulatorRef.current = 0;
        }
      }}
      onTouchStart={(event) => {
        if (disabled || event.touches.length === 0) {
          return;
        }
        if (isInteractiveButtonTarget(event.target)) {
          return;
        }
        touchActiveRef.current = true;
        dragAccumulatorRef.current = 0;
        dragLastYRef.current = event.touches[0].clientY;
      }}
      onTouchMove={(event) => {
        if (!touchActiveRef.current || event.touches.length === 0) {
          return;
        }
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
        className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border-light)] bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-40"
        disabled={disabled || !canIncrement}
        onClick={onIncrement}
      >
        <ChevronUp size={14} strokeWidth={2.5} />
      </button>

      <div className="flex h-11 w-11 items-center justify-center rounded-[8px] border border-[var(--border-light)] bg-black">
        <span className="font-mono text-base font-semibold text-white">{value === null ? "-" : value}</span>
      </div>

      <button
        type="button"
        aria-label="Decrementar"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border-light)] bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-40"
        disabled={disabled || !canDecrement}
        onClick={onDecrement}
      >
        <ChevronDown size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
}

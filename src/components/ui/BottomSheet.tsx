"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: number;
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidth = 469
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
      />
      <section
        className="relative w-full rounded-t-[28px] border border-[var(--border-subtle)] bg-[color:var(--bg-surface-1)] px-4 pb-4 pt-3 shadow-[0_-12px_32px_rgba(0,0,0,0.34)]"
        style={{ maxWidth, paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[var(--border-subtle)]" />
        {title ? <h2 className="mb-2 text-[18px] font-black text-[var(--text-primary)]">{title}</h2> : null}
        <div>{children}</div>
        {footer ? <div className="mt-4">{footer}</div> : null}
      </section>
    </div>
  );
}

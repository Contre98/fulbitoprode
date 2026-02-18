"use client";

import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  children?: ReactNode;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  tone = "default",
  loading = false,
  onCancel,
  onConfirm,
  children
}: ConfirmDialogProps) {
  return (
    <BottomSheet
      open={open}
      onClose={loading ? () => undefined : onCancel}
      title={title}
      footer={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="min-h-11 flex-1 rounded-xl border border-[var(--border-subtle)] bg-[color:var(--bg-surface-2)] px-3 text-[13px] font-semibold text-[var(--text-primary)] disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`min-h-11 flex-1 rounded-xl px-3 text-[13px] font-bold disabled:opacity-50 ${
              tone === "danger"
                ? "bg-[var(--danger)] text-white"
                : "bg-[var(--accent-primary)] text-[var(--text-on-accent)]"
            }`}
          >
            {loading ? "Procesando..." : confirmLabel}
          </button>
        </div>
      }
    >
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[color:var(--bg-surface-2)] p-3">
        <p className="flex items-start gap-2 text-[13px] text-[var(--text-secondary)]">
          {tone === "danger" ? <AlertTriangle size={16} className="mt-0.5 text-[var(--danger)]" /> : null}
          <span>{description}</span>
        </p>
        {children ? <div className="mt-2">{children}</div> : null}
      </div>
    </BottomSheet>
  );
}

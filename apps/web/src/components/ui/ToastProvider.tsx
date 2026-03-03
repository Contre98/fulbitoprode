"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";

type ToastTone = "success" | "error" | "info";

interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  durationMs?: number;
}

interface ToastItem extends ToastInput {
  id: string;
  tone: ToastTone;
}

interface ToastContextValue {
  showToast: (input: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
const fallbackToastContext: ToastContextValue = {
  showToast: () => {
    // No-op fallback for isolated renders (e.g. unit tests without app providers).
  }
};

function toneStyles(tone: ToastTone) {
  if (tone === "success") {
    return {
      icon: <CheckCircle2 size={16} className="text-[var(--success)]" />,
      cardClass: "border-[rgba(116,226,122,0.28)] bg-[color:var(--bg-surface-2)]"
    };
  }

  if (tone === "error") {
    return {
      icon: <CircleAlert size={16} className="text-[var(--danger)]" />,
      cardClass: "border-[rgba(255,107,125,0.28)] bg-[color:var(--bg-surface-2)]"
    };
  }

  return {
    icon: <Info size={16} className="text-[var(--accent-primary)]" />,
    cardClass: "border-[var(--border-subtle)] bg-[color:var(--bg-surface-2)]"
  };
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, description, tone = "info", durationMs = 2600 }: ToastInput) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setToasts((current) => [...current, { id, title, description, tone }]);
      window.setTimeout(() => removeToast(id), durationMs);
    },
    [removeToast]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[120] mx-auto flex w-full max-w-[469px] flex-col gap-2 px-3">
        {toasts.map((toast) => {
          const tone = toneStyles(toast.tone);
          return (
            <section
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-2 rounded-2xl border px-3 py-2.5 shadow-[0_14px_34px_rgba(0,0,0,0.25)] backdrop-blur ${tone.cardClass}`}
              role="status"
              aria-live="polite"
            >
              <div className="mt-0.5">{tone.icon}</div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-[var(--text-primary)]">{toast.title}</p>
                {toast.description ? <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">{toast.description}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                aria-label="Cerrar notificación"
                className="flex min-h-8 min-w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] active:bg-[color:var(--bg-surface-1)]"
              >
                <X size={14} />
              </button>
            </section>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return fallbackToastContext;
  }
  return context;
}

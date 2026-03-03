"use client";

import { useEffect, useMemo, useState } from "react";

type LiveStatus = "checking" | "online" | "offline";

interface ProviderHealthResponse {
  configured: boolean;
  ok: boolean;
}

function badgeStyles(status: LiveStatus) {
  if (status === "online") {
    return "border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[var(--success)]";
  }

  if (status === "offline") {
    return "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--warning)]";
  }

  return "border-[var(--border-subtle)] bg-[var(--surface-card-muted)] text-[var(--text-secondary)]";
}

export function LiveDataStatusBadge() {
  const [status, setStatus] = useState<LiveStatus>("checking");

  useEffect(() => {
    if (process.env.NODE_ENV === "test") {
      return;
    }

    let cancelled = false;

    async function checkProvider() {
      try {
        const response = await fetch("/api/health/provider", {
          method: "GET",
          cache: "no-store"
        });

        const payload = (await response.json()) as ProviderHealthResponse;
        if (cancelled) {
          return;
        }

        setStatus(payload.configured && payload.ok ? "online" : "offline");
      } catch {
        if (!cancelled) {
          setStatus("offline");
        }
      }
    }

    void checkProvider();
    const interval = setInterval(() => {
      void checkProvider();
    }, 60000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const label = useMemo(() => {
    if (status === "online") return "LIVE";
    if (status === "offline") return "FALLBACK";
    return "CHECK";
  }, [status]);

  return (
    <span className={`rounded-full border px-2 py-[3px] text-[9px] font-bold tracking-[0.8px] ${badgeStyles(status)}`}>
      {label}
    </span>
  );
}

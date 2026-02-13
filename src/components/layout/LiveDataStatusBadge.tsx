"use client";

import { useEffect, useMemo, useState } from "react";

type LiveStatus = "checking" | "online" | "offline";

interface ProviderHealthResponse {
  configured: boolean;
  ok: boolean;
}

function badgeStyles(status: LiveStatus) {
  if (status === "online") {
    return "border-[#334400] bg-[#1a2600] text-[var(--accent)]";
  }

  if (status === "offline") {
    return "border-[#4a3c1a] bg-[#2a2310] text-[#fbbf24]";
  }

  return "border-[var(--border-dim)] bg-[var(--bg-surface)] text-[var(--text-secondary)]";
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

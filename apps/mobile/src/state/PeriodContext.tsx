import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

interface PeriodContextValue {
  fecha: string;
  options: string[];
  setFecha: (next: string) => void;
}

const DEFAULT_FECHA = "2026-01";
const DEFAULT_OPTIONS = ["2026-01", "2026-02", "2026-03"];

const PeriodContext = createContext<PeriodContextValue | null>(null);

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [fecha, setFecha] = useState(DEFAULT_FECHA);
  const value = useMemo(
    () => ({
      fecha,
      options: DEFAULT_OPTIONS,
      setFecha
    }),
    [fecha]
  );

  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>;
}

export function usePeriod() {
  const ctx = useContext(PeriodContext);
  if (!ctx) {
    throw new Error("usePeriod must be used within PeriodProvider");
  }
  return ctx;
}

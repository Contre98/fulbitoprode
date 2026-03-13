import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_PERIOD_OPTIONS, periodRepository } from "@/repositories";
import { useGroupSelection } from "@/state/GroupContext";

interface PeriodContextValue {
  fecha: string;
  defaultFecha: string;
  options: Array<{ id: string; label: string }>;
  setFecha: (next: string) => void;
}

const DEFAULT_FECHA = "2026-01";
const DEFAULT_OPTIONS = DEFAULT_PERIOD_OPTIONS;
const FECHA_STORAGE_KEY = "fulbito.mobile.selectedFecha";

const PeriodContext = createContext<PeriodContextValue | null>(null);

export function PeriodProvider({ children }: { children: ReactNode }) {
  const { memberships, selectedGroupId } = useGroupSelection();
  const activeMembership = memberships.find((membership) => membership.groupId === selectedGroupId) ?? memberships[0];
  const fechaStorageKey = activeMembership ? `${FECHA_STORAGE_KEY}:${activeMembership.groupId}` : FECHA_STORAGE_KEY;
  const [fecha, setFecha] = useState(DEFAULT_FECHA);
  const [defaultFecha, setDefaultFecha] = useState(DEFAULT_FECHA);
  const [options, setOptions] = useState<Array<{ id: string; label: string }>>(DEFAULT_OPTIONS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHydrated(false);
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(fechaStorageKey);
        if (!cancelled) {
          setFecha(stored ?? "");
        }
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fechaStorageKey]);

  useEffect(() => {
    if (!activeMembership) {
      setOptions(DEFAULT_OPTIONS);
      setDefaultFecha(DEFAULT_OPTIONS[0]?.id ?? DEFAULT_FECHA);
      return;
    }

    let cancelled = false;
    void (async () => {
      const payload = await periodRepository.listPeriodOptions({
        leagueId: activeMembership.leagueId,
        season: activeMembership.season,
        competitionStage: activeMembership.competitionStage
      });
      if (cancelled || payload.options.length === 0) {
        return;
      }
      setOptions(payload.options);
      const defaultFecha =
        payload.defaultFecha && payload.options.some((item) => item.id === payload.defaultFecha)
          ? payload.defaultFecha
          : payload.options[0].id;
      setDefaultFecha(defaultFecha);
      setFecha((current) => (payload.options.some((item) => item.id === current) ? current : defaultFecha));
    })();

    return () => {
      cancelled = true;
    };
  }, [activeMembership?.groupId, activeMembership?.leagueId, activeMembership?.season, activeMembership?.competitionStage]);

  useEffect(() => {
    if (!options.some((item) => item.id === fecha) && options.length > 0) {
      setFecha(options[0].id);
    }
  }, [fecha, options]);

  useEffect(() => {
    if (!options.some((item) => item.id === defaultFecha) && options.length > 0) {
      setDefaultFecha(options[0].id);
    }
  }, [defaultFecha, options]);

  useEffect(() => {
    if (!hydrated || !fecha) {
      return;
    }
    void AsyncStorage.setItem(fechaStorageKey, fecha);
  }, [fecha, fechaStorageKey, hydrated]);

  const value = useMemo(
    () => ({
      fecha,
      defaultFecha,
      options,
      setFecha
    }),
    [fecha, defaultFecha, options]
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

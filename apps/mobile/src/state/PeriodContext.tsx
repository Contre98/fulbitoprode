import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useGroupSelection } from "@/state/GroupContext";

interface PeriodContextValue {
  fecha: string;
  options: Array<{ id: string; label: string }>;
  setFecha: (next: string) => void;
}

const DEFAULT_FECHA = "2026-01";
const DEFAULT_OPTIONS = [
  { id: "2026-01", label: "Fecha 1" },
  { id: "2026-02", label: "Fecha 2" },
  { id: "2026-03", label: "Fecha 3" }
];
const FECHA_STORAGE_KEY = "fulbito.mobile.selectedFecha";

const PeriodContext = createContext<PeriodContextValue | null>(null);

function getApiBaseUrl() {
  const raw = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (!raw) return null;
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

export function PeriodProvider({ children }: { children: ReactNode }) {
  const { memberships, selectedGroupId } = useGroupSelection();
  const activeMembership = memberships.find((membership) => membership.groupId === selectedGroupId) ?? memberships[0];
  const [fecha, setFecha] = useState(DEFAULT_FECHA);
  const [options, setOptions] = useState<Array<{ id: string; label: string }>>(DEFAULT_OPTIONS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(FECHA_STORAGE_KEY);
        if (!cancelled && stored) {
          setFecha(stored);
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
  }, []);

  useEffect(() => {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl || !activeMembership) {
      setOptions(DEFAULT_OPTIONS);
      return;
    }

    let cancelled = false;
    const query = new URLSearchParams({
      leagueId: String(activeMembership.leagueId),
      season: activeMembership.season
    });
    if (activeMembership.competitionStage) {
      query.set("competitionStage", activeMembership.competitionStage);
    }

    void (async () => {
      try {
        const response = await fetch(`${baseUrl}/api/fechas?${query.toString()}`, {
          method: "GET",
          credentials: "include"
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = (await response.json()) as {
          fechas?: Array<{ id: string; label: string }>;
          defaultFecha?: string;
        };

        const fetchedOptions = payload.fechas?.filter((item) => item?.id && item?.label) ?? [];
        if (cancelled || fetchedOptions.length === 0) {
          return;
        }

        setOptions(fetchedOptions);
        const defaultFecha = payload.defaultFecha && fetchedOptions.some((item) => item.id === payload.defaultFecha)
          ? payload.defaultFecha
          : fetchedOptions[0].id;
        setFecha((current) => (fetchedOptions.some((item) => item.id === current) ? current : defaultFecha));
      } catch {
        if (!cancelled) {
          setOptions(DEFAULT_OPTIONS);
          setFecha((current) => (DEFAULT_OPTIONS.some((item) => item.id === current) ? current : DEFAULT_FECHA));
        }
      }
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
    if (!hydrated || !fecha) {
      return;
    }
    void AsyncStorage.setItem(FECHA_STORAGE_KEY, fecha);
  }, [fecha, hydrated]);

  const value = useMemo(
    () => ({
      fecha,
      options,
      setFecha
    }),
    [fecha, options]
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

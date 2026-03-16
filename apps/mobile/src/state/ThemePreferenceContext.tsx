import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setThemeName } from "@fulbito/design-tokens";

export type ThemePreference = "light" | "dark";

interface ThemePreferenceContextValue {
  themePreference: ThemePreference;
  setThemePreference: (next: ThemePreference) => void;
  hydrated: boolean;
}

const THEME_STORAGE_KEY = "fulbito.mobile.themePreference";
const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

function normalizeThemePreference(value: string | null): ThemePreference | null {
  if (value === "light" || value === "dark") {
    return value;
  }
  return null;
}

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const fallbackTheme: ThemePreference = systemColorScheme === "dark" ? "dark" : "light";
  const [themePreference, setThemePreference] = useState<ThemePreference>(fallbackTheme);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        const normalized = normalizeThemePreference(stored);
        if (!cancelled && normalized) {
          setThemePreference(normalized);
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
    if (!hydrated) {
      return;
    }
    void AsyncStorage.setItem(THEME_STORAGE_KEY, themePreference);
  }, [hydrated, themePreference]);

  useEffect(() => {
    setThemeName(themePreference);
  }, [themePreference]);

  const value = useMemo(
    () => ({
      themePreference,
      setThemePreference,
      hydrated
    }),
    [themePreference, hydrated]
  );

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>;
}

export function useThemePreference() {
  const ctx = useContext(ThemePreferenceContext);
  const systemColorScheme = useColorScheme();
  const fallbackTheme: ThemePreference = systemColorScheme === "dark" ? "dark" : "light";

  if (!ctx) {
    return {
      themePreference: fallbackTheme,
      hydrated: false,
      setThemePreference: () => undefined
    };
  }
  return ctx;
}

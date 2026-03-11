import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Appearance } from "react-native";
import { resolveThemeName, type ThemeName } from "@fulbito/design-tokens";

const THEME_PREFERENCE_STORAGE_KEY = "fulbito.mobile.themePreference";

export type ThemePreference = "system" | ThemeName;

type ThemePreferenceContextValue = {
  themeName: ThemeName;
  preference: ThemePreference;
  hydrated: boolean;
  setPreference: (next: ThemePreference) => Promise<void>;
};

const defaultThemeName = resolveThemeName(Appearance.getColorScheme());

const ThemePreferenceContext = createContext<ThemePreferenceContextValue>({
  themeName: defaultThemeName,
  preference: "system",
  hydrated: false,
  setPreference: async () => undefined
});

function normalizePreference(value: string | null): ThemePreference {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }
  return "system";
}

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [systemThemeName, setSystemThemeName] = useState<ThemeName>(defaultThemeName);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_PREFERENCE_STORAGE_KEY);
        if (!cancelled) {
          setPreferenceState(normalizePreference(stored));
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
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemThemeName(resolveThemeName(colorScheme));
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const themeName: ThemeName = preference === "system" ? systemThemeName : preference;

  async function setPreference(next: ThemePreference) {
    setPreferenceState(next);

    if (next === "system") {
      await AsyncStorage.removeItem(THEME_PREFERENCE_STORAGE_KEY);
      return;
    }

    await AsyncStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, next);
  }

  const value = useMemo(
    () => ({
      themeName,
      preference,
      hydrated,
      setPreference
    }),
    [hydrated, preference, themeName]
  );

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>;
}

export function useThemePreference() {
  return useContext(ThemePreferenceContext);
}

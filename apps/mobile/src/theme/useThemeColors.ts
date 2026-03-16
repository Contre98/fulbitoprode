import { useMemo } from "react";
import { getColors } from "@fulbito/design-tokens";
import type { ColorTokens } from "@fulbito/design-tokens";
import { useThemePreference } from "@/state/ThemePreferenceContext";

export function useThemeColors(): ColorTokens {
  const { themePreference } = useThemePreference();
  return useMemo(() => getColors(themePreference), [themePreference]);
}

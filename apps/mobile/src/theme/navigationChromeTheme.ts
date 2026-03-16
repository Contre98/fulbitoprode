import { useMemo } from "react";
import { getColors } from "@fulbito/design-tokens";
import { useThemePreference } from "@/state/ThemePreferenceContext";

export interface NavigationChromeTheme {
  isDark: boolean;
  headerBackground: string;
  headerBorder: string;
  headerAccent: string;
  tabBarBackground: string;
  tabBarBorder: string;
  tabBarShadow: string;
  tabLabelActive: string;
  tabLabelInactive: string;
  tabIndicator: string;
  tabIconActive: string;
  tabIconInactive: string;
  centerTabBackgroundActive: string;
  centerTabBorderActive: string;
  centerTabBackgroundIdle: string;
  centerTabBorderIdle: string;
  centerTabInnerActive: string;
  centerTabInnerIdle: string;
  centerTabIconActive: string;
  centerTabIconInactive: string;
  centerTabLabelActive: string;
}

const lightColors = getColors("light");
const darkColors = getColors("dark");

const LIGHT_CHROME_THEME: NavigationChromeTheme = {
  isDark: false,
  headerBackground: lightColors.surface,
  headerBorder: lightColors.borderLight,
  headerAccent: lightColors.primary,
  tabBarBackground: lightColors.surface,
  tabBarBorder: lightColors.borderLight,
  tabBarShadow: lightColors.textPrimary,
  tabLabelActive: lightColors.primaryDeep,
  tabLabelInactive: lightColors.textSecondary,
  tabIndicator: lightColors.primary,
  tabIconActive: lightColors.primary,
  tabIconInactive: lightColors.textSecondary,
  centerTabBackgroundActive: lightColors.primaryStrong,
  centerTabBorderActive: lightColors.surface,
  centerTabBackgroundIdle: lightColors.surface,
  centerTabBorderIdle: lightColors.borderSubtle,
  centerTabInnerActive: "rgba(0,0,0,0.08)",
  centerTabInnerIdle: "transparent",
  centerTabIconActive: lightColors.textInverse,
  centerTabIconInactive: lightColors.textSecondary,
  centerTabLabelActive: lightColors.primary
};

const DARK_CHROME_THEME: NavigationChromeTheme = {
  isDark: true,
  headerBackground: darkColors.surface,
  headerBorder: darkColors.borderLight,
  headerAccent: darkColors.primary,
  tabBarBackground: darkColors.surface,
  tabBarBorder: darkColors.borderLight,
  tabBarShadow: "#000000",
  tabLabelActive: darkColors.primaryDeep,
  tabLabelInactive: darkColors.textSecondary,
  tabIndicator: darkColors.primaryDeep,
  tabIconActive: darkColors.primaryDeep,
  tabIconInactive: darkColors.textSecondary,
  centerTabBackgroundActive: darkColors.primaryStrong,
  centerTabBorderActive: darkColors.surface,
  centerTabBackgroundIdle: darkColors.surfaceSoft,
  centerTabBorderIdle: darkColors.borderSubtle,
  centerTabInnerActive: "rgba(15,23,42,0.24)",
  centerTabInnerIdle: "transparent",
  centerTabIconActive: darkColors.textInverse,
  centerTabIconInactive: darkColors.textSecondary,
  centerTabLabelActive: darkColors.primaryDeep
};

export function useNavigationChromeTheme(): NavigationChromeTheme {
  const { themePreference } = useThemePreference();
  const isDark = themePreference === "dark";

  return useMemo(() => (isDark ? DARK_CHROME_THEME : LIGHT_CHROME_THEME), [isDark]);
}

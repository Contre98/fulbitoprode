export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32
} as const;

export const lightColors = {
  // Brand identity
  primary: "#B6D900",
  secondary: "#F5F7F2",

  // App surfaces
  background: "#F5F7F2",
  canvas: "#DDE2E8",
  surface: "#FFFFFF",
  surfaceSoft: "#F8FAFC",
  surfaceMuted: "#EEF1F5",

  // Brand accents
  primaryStrong: "#B6D900",
  primaryAccent: "#A3C90A",
  primarySoft: "#E9EFCF",
  primarySoftAlt: "#F4F8E7",
  primaryHighlight: "#FCFFE8",
  primaryLime: "#CFE77A",
  primaryTextSoft: "#9DBB00",
  primaryDeep: "#89B300",
  primaryAlpha16: "rgba(182,217,0,0.16)",
  brandTint: "#E8EDCD",
  brandTintSoft: "#EFF4E6",
  brandTintAlt: "#E9EDF2",
  brandTintAlt2: "#E8EDF2",

  // Text
  primaryText: "#101923",
  textPrimary: "#0B111A",
  textTitle: "#0F172A",
  textHigh: "#111827",
  textStrong: "#1F2937",
  textSecondary: "#5D6675",
  textTertiary: "#667085",
  textQuaternary: "#666F7E",
  textMuted: "#8A94A4",
  textMutedAlt: "#7A8698",
  textSoft: "#98A2B3",
  textSoftAlt: "#97A1B1",
  textSoftAlt2: "#9AA4B2",
  textBody: "#344054",
  textBodyMuted: "#475467",
  textBodyStrong: "#4B5563",
  textSlate: "#475569",
  textSlateStrong: "#334155",
  textSlateSoft: "#64748B",
  textGray: "#6B7280",
  textSteel: "#5F6B7A",
  textBrandDark: "#44511B",
  iconStrong: "#374151",
  textInverse: "#F9FAFB",

  // Borders
  borderSubtle: "#D7DCE3",
  borderMuted: "#DDE3EA",
  borderMutedAlt: "#CED5DE",
  borderMutedSoft: "#D8DEE7",
  borderInfo: "#C9D5E3",
  borderLight: "#E1E6ED",
  borderWarningSoft: "#F1C38C",
  borderDangerSoft: "#F1A4AC",
  borderDangerMuted: "#F4CCCC",
  borderDangerAlt: "#F8C8C8",

  // Surfaces
  surfaceTintBlue: "#E9EEF5",
  surfaceTintBlueSoft: "#EEF4FB",
  surfaceTintNeutral: "#EEF2F5",
  surfaceTintCard: "#F5F7FA",
  surfaceTintWarm: "#EEE6D6",
  surfaceTintWarning: "#FDF3E8",
  surfaceTintDanger: "#FFECEE",
  surfaceTintDangerSoft: "#FDECEC",

  // Status
  success: "#C6FF00",
  successDeep: "#065F46",
  danger: "#EF4444",
  dangerDeep: "#B42318",
  dangerStrong: "#B91C1C",
  dangerAccent: "#DC2626",
  dangerMuted: "#DB5E6D",
  dangerSoft: "#FCA5A5",
  warning: "#F59E0B",
  warningAccent: "#FBBF24",
  warningDeep: "#C47C00",
  warningMuted: "#D09044",

  // Decorative accents
  trophy: "#D5A406",
  trophyDeep: "#C59200",
  info: "#60A5FA",
  successAccent: "#22C55E",
  slate: "#94A3B8",
  slateMuted: "#9CA3AF",

  // Overlays
  overlaySubtle: "rgba(11,17,26,0.34)",
  overlay: "rgba(15, 23, 42, 0.45)",
  overlaySoft: "rgba(15,23,42,0.38)",

  // Data mode badges
  dataLiveBg: "#123221",
  dataMockBg: "#322610"
} as const;

export type ColorTokenName = keyof typeof lightColors;
export type ColorTokens = Record<ColorTokenName, string>;
export type ThemeName = "light";

export const themes = {
  light: {
    colors: lightColors,
    spacing
  }
} as const;

let activeThemeName: ThemeName = "light";

export function getActiveThemeName(): ThemeName {
  return activeThemeName;
}

export function getTheme(themeName: ThemeName = activeThemeName) {
  return themes[themeName];
}

export function getColors(themeName: ThemeName = activeThemeName): ColorTokens {
  return themes[themeName].colors;
}

export let colors: ColorTokens = getColors(activeThemeName);

export function setThemeName(themeName: ThemeName) {
  activeThemeName = themeName;
  colors = getColors(activeThemeName);
}

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
export type ThemeName = "light" | "dark";

type AppearanceLike = {
  addChangeListener?: (listener: (event: { colorScheme: string | null }) => void) => void;
  getColorScheme?: () => string | null;
};

function getAppearanceModule(): AppearanceLike | null {
  try {
    // Access React Native appearance API only when available (native runtime/tests).
    const dynamicRequire = Function("return typeof require !== 'undefined' ? require : null")() as
      | ((moduleName: string) => unknown)
      | null;

    if (!dynamicRequire) {
      return null;
    }

    const reactNative = dynamicRequire("react-native") as { Appearance?: AppearanceLike } | null;
    return reactNative?.Appearance ?? null;
  } catch {
    return null;
  }
}

export const darkColors: ColorTokens = {
  // Brand identity
  primary: "#B6D900",
  secondary: "#101923",

  // App surfaces
  background: "#060B12",
  canvas: "#0B121C",
  surface: "#121B27",
  surfaceSoft: "#182333",
  surfaceMuted: "#1E2A3B",

  // Brand accents
  primaryStrong: "#C6EC24",
  primaryAccent: "#B2DE1A",
  primarySoft: "#334212",
  primarySoftAlt: "#28350F",
  primaryHighlight: "#394A16",
  primaryLime: "#9ABD2F",
  primaryTextSoft: "#D9F571",
  primaryDeep: "#98BC00",
  primaryAlpha16: "rgba(182,217,0,0.24)",
  brandTint: "#25301A",
  brandTintSoft: "#1E2A19",
  brandTintAlt: "#1A2432",
  brandTintAlt2: "#16202D",

  // Text
  primaryText: "#F5F8FC",
  textPrimary: "#EEF4FA",
  textTitle: "#F7FAFF",
  textHigh: "#E9EFF7",
  textStrong: "#DDE6F1",
  textSecondary: "#B5C1D2",
  textTertiary: "#A8B5C7",
  textQuaternary: "#9DAABC",
  textMuted: "#8B99AE",
  textMutedAlt: "#95A3B6",
  textSoft: "#7D8CA2",
  textSoftAlt: "#8696AB",
  textSoftAlt2: "#90A0B4",
  textBody: "#C3CFDE",
  textBodyMuted: "#B1BECE",
  textBodyStrong: "#CED8E6",
  textSlate: "#A0B0C4",
  textSlateStrong: "#C3D0E2",
  textSlateSoft: "#8A9BB2",
  textGray: "#97A3B5",
  textSteel: "#A8B5C8",
  textBrandDark: "#D3E89C",
  iconStrong: "#D2DCE8",
  textInverse: "#0B111A",

  // Borders
  borderSubtle: "#2A384A",
  borderMuted: "#314055",
  borderMutedAlt: "#3A4B61",
  borderMutedSoft: "#354559",
  borderInfo: "#355170",
  borderLight: "#3A4D64",
  borderWarningSoft: "#9C7438",
  borderDangerSoft: "#8B4350",
  borderDangerMuted: "#7A3B45",
  borderDangerAlt: "#934A56",

  // Surfaces
  surfaceTintBlue: "#182334",
  surfaceTintBlueSoft: "#1B2A3E",
  surfaceTintNeutral: "#1A2532",
  surfaceTintCard: "#1B2736",
  surfaceTintWarm: "#2D261A",
  surfaceTintWarning: "#352816",
  surfaceTintDanger: "#321A1E",
  surfaceTintDangerSoft: "#2A161A",

  // Status
  success: "#9AD400",
  successDeep: "#A7F3D0",
  danger: "#F87171",
  dangerDeep: "#FCA5A5",
  dangerStrong: "#FB7185",
  dangerAccent: "#EF4444",
  dangerMuted: "#F28B9A",
  dangerSoft: "#FCA5A5",
  warning: "#FBBF24",
  warningAccent: "#FACC15",
  warningDeep: "#FDE68A",
  warningMuted: "#F2B76C",

  // Decorative accents
  trophy: "#E0B82E",
  trophyDeep: "#CFA21A",
  info: "#60A5FA",
  successAccent: "#4ADE80",
  slate: "#94A3B8",
  slateMuted: "#A3ADB8",

  // Overlays
  overlaySubtle: "rgba(2,6,12,0.52)",
  overlay: "rgba(2,6,12,0.66)",
  overlaySoft: "rgba(2,6,12,0.58)",

  // Data mode badges
  dataLiveBg: "#133727",
  dataMockBg: "#3B2A0F"
};

export const themes = {
  light: {
    colors: lightColors,
    spacing
  },
  dark: {
    colors: darkColors,
    spacing
  }
} as const;

export function resolveThemeName(colorScheme?: string | null): ThemeName {
  return colorScheme === "dark" ? "dark" : "light";
}

const appearance = getAppearanceModule();

let activeThemeName: ThemeName = resolveThemeName(
  typeof appearance?.getColorScheme === "function" ? appearance.getColorScheme() : null
);

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

if (typeof appearance?.addChangeListener === "function") {
  appearance.addChangeListener(({ colorScheme }: { colorScheme: string | null }) => {
    setThemeName(resolveThemeName(colorScheme));
  });
}

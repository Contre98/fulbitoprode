export const designTokens = {
  accent: "#ccff00",
  accentDim: "#1a2600",
  bgBody: "#09090b",
  bgSurface: "#18181b",
  bgSurfaceElevated: "#27272a",
  borderDim: "#27272a",
  borderLight: "#3f3f46",
  textPrimary: "#e4e4e7",
  textSecondary: "#a1a1aa",
  textMuted: "#71717a",
  textTertiary: "#52525b"
} as const;

export const pointsToneColors = {
  positive: {
    badgeBg: "#151d10",
    badgeBorder: "#304122",
    text: designTokens.accent
  },
  warning: {
    badgeBg: "#242207",
    badgeBorder: "#403c21",
    text: "#ffb309"
  },
  danger: {
    badgeBg: "#1c0f0f",
    badgeBorder: "#a03b3b",
    text: "#f33636"
  },
  neutral: {
    badgeBg: "#18181b",
    badgeBorder: "#3f3f46",
    text: "#a1a1aa"
  }
} as const;

export const designTokens = {
  accent: "#ccff00",
  accentDim: "rgba(204,255,0,0.2)",
  bgBody: "#050507",
  bgSurface: "#0b0c0f",
  bgSurfaceElevated: "#13161c",
  borderDim: "#262b34",
  borderLight: "#37404f",
  textPrimary: "#f4f6fa",
  textSecondary: "#a8b0bd",
  textMuted: "#7f8998",
  textTertiary: "#7f8998"
} as const;

export const pointsToneColors = {
  positive: {
    badgeBg: "rgba(116,226,122,0.16)",
    badgeBorder: "rgba(116,226,122,0.44)",
    text: "var(--success)"
  },
  warning: {
    badgeBg: "rgba(255,180,84,0.16)",
    badgeBorder: "rgba(255,180,84,0.44)",
    text: "var(--warning)"
  },
  danger: {
    badgeBg: "rgba(255,107,125,0.16)",
    badgeBorder: "rgba(255,107,125,0.44)",
    text: "var(--danger)"
  },
  neutral: {
    badgeBg: "var(--bg-surface-2)",
    badgeBorder: "var(--border-subtle)",
    text: "var(--text-secondary)"
  }
} as const;

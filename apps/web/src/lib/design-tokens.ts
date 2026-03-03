export const designTokens = {
  accent: "var(--accent-primary)",
  accentDim: "var(--accent-soft)",
  bgBody: "var(--bg-app)",
  bgSurface: "var(--bg-surface-1)",
  bgSurfaceElevated: "var(--bg-surface-2)",
  borderDim: "var(--border-subtle)",
  borderLight: "var(--border-light)",
  textPrimary: "var(--text-primary)",
  textSecondary: "var(--text-secondary)",
  textMuted: "var(--text-muted)",
  textTertiary: "var(--text-muted)"
} as const;

export const pointsToneColors = {
  positive: {
    badgeBg: "var(--status-success-bg)",
    badgeBorder: "var(--status-success-border)",
    text: "var(--success)"
  },
  warning: {
    badgeBg: "var(--status-warning-bg)",
    badgeBorder: "var(--status-warning-border)",
    text: "var(--warning)"
  },
  danger: {
    badgeBg: "var(--status-danger-bg)",
    badgeBorder: "var(--status-danger-border)",
    text: "var(--danger)"
  },
  neutral: {
    badgeBg: "var(--bg-surface-2)",
    badgeBorder: "var(--border-subtle)",
    text: "var(--text-secondary)"
  }
} as const;

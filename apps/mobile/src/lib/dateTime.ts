const DEFAULT_LOCALE = "es-AR";
const DEFAULT_TIME_ZONE = "America/Argentina/Buenos_Aires";

function toValidDate(input: Date | string): Date | null {
  const date = input instanceof Date ? input : new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatClock24(input: Date | string, options?: { withSeconds?: boolean }): string {
  const date = toValidDate(input);
  if (!date) return options?.withSeconds ? "--:--:--" : "--:--";
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    second: options?.withSeconds ? "2-digit" : undefined,
    hour12: false,
    timeZone: DEFAULT_TIME_ZONE
  }).format(date);
}

export function formatShortDateTime24(input: Date | string): string {
  const date = toValidDate(input);
  if (!date) return "--/-- --:--";
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: DEFAULT_TIME_ZONE
  }).format(date);
}

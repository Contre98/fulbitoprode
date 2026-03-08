export function parseInviteTokenFromUrl(url: string | null | undefined) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const token = parsed.searchParams.get("invite")?.trim() || "";
    return token || null;
  } catch {
    const match = /[?&]invite=([^&#]+)/i.exec(url);
    if (!match) return null;
    const token = decodeURIComponent(match[1] || "").trim();
    return token || null;
  }
}

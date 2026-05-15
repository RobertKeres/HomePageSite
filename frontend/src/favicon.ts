/** Ordered favicon candidates (tracking blockers often break Google-only flows). */
export function faviconCandidatesForSite(url: string): string[] {
  try {
    const u = new URL(url);
    const host = u.hostname;
    const origin = u.origin;
    return [
      `${origin}/favicon.ico`,
      `https://icons.duckduckgo.com/ip3/${host}.ico`,
      `https://icon.horse/icon/${encodeURIComponent(host)}`,
      `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`,
    ];
  } catch {
    return [];
  }
}

/** @deprecated use faviconCandidatesForSite + FaviconImg */
export function faviconUrlForSite(url: string): string {
  const c = faviconCandidatesForSite(url);
  return c[c.length - 1] ?? "";
}

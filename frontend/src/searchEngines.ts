import type { SearchEngineId } from "./types";

const templates: Record<SearchEngineId, string> = {
  duckduckgo: "https://duckduckgo.com/?q={q}",
  google: "https://www.google.com/search?q={q}",
  bing: "https://www.bing.com/search?q={q}",
};

export function searchUrl(engine: SearchEngineId, query: string): string {
  const t = templates[engine];
  return t.replace("{q}", encodeURIComponent(query));
}

export const searchEngineLabels: Record<SearchEngineId, string> = {
  duckduckgo: "DuckDuckGo",
  google: "Google",
  bing: "Bing",
};

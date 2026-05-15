import type { AppConfig } from "./types";
import { createDefaultConfig, normalizeConfig } from "./defaultConfig";
import { randomBytes } from "./uuid";

const TOKEN_KEY = "homepage_config_token";
const PROFILE_KEY = "homepage_profile_id";

export function getStoredToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? "";
}

export function setStoredToken(token: string) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/** Isolated config file on server (hashed); empty = legacy shared `config.json`. */
export function getProfileToken(): string {
  return localStorage.getItem(PROFILE_KEY) ?? "";
}

export function setProfileToken(token: string) {
  if (token.trim()) localStorage.setItem(PROFILE_KEY, token.trim());
  else localStorage.removeItem(PROFILE_KEY);
}

export function generateProfileToken(): string {
  const bytes = randomBytes(24);
  const b64 = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `hp_${b64}`;
}

function buildHeaders(jsonBody: boolean): Headers {
  const h = new Headers();
  const profile = getProfileToken();
  if (profile) h.set("X-Homepage-Profile", profile);
  const t = getStoredToken();
  if (t) h.set("Authorization", `Bearer ${t}`);
  if (jsonBody) h.set("Content-Type", "application/json");
  return h;
}

export async function fetchConfig(): Promise<{ config: AppConfig; unauthorized: boolean }> {
  const res = await fetch("/api/config", { headers: buildHeaders(false) });
  if (res.status === 401) return { config: createDefaultConfig(), unauthorized: true };
  if (res.status === 404) {
    const body = (await res.json()) as { default?: AppConfig };
    return {
      config: normalizeConfig(body.default ?? createDefaultConfig()),
      unauthorized: false,
    };
  }
  if (!res.ok) throw new Error(`Failed to load config: ${res.status}`);
  const config = normalizeConfig((await res.json()) as AppConfig);
  return { config, unauthorized: false };
}

export async function saveConfig(config: AppConfig): Promise<AppConfig> {
  const res = await fetch("/api/config", {
    method: "PUT",
    headers: buildHeaders(true),
    body: JSON.stringify(config),
  });
  if (res.status === 401) throw new Error("Unauthorized — check API token in settings.");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.error === "string" ? err.error : "Save failed");
  }
  return normalizeConfig((await res.json()) as AppConfig);
}

/** Best-effort save when leaving the page (tab close / navigation) so debounced saves are not lost. */
export function saveConfigFlush(config: AppConfig): void {
  void fetch("/api/config", {
    method: "PUT",
    headers: buildHeaders(true),
    body: JSON.stringify(config),
    keepalive: true,
  });
}

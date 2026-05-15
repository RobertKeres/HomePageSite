import { useRef, useState } from "react";
import {
  generateProfileToken,
  getProfileToken,
  getStoredToken,
  saveConfig,
  setProfileToken,
  setStoredToken,
} from "../api";
import { normalizeConfig } from "../defaultConfig";
import type { AppConfig, SearchEngineId, ThemeId } from "../types";
import { searchEngineLabels } from "../searchEngines";
import { useAppConfig } from "../configContext";

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { config, updateGlobal, reload, replaceConfig, setSelectedWidgetId } = useAppConfig();
  const [token, setToken] = useState(getStoredToken);
  const [importBusy, setImportBusy] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const profileActive = Boolean(getProfileToken());

  return (
    <>
      <div className="sheet-backdrop" aria-hidden onClick={onClose} />
      <aside className="sheet" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <h2 id="settings-title">Settings</h2>

        <div className="field">
          <label htmlFor="theme">Theme</label>
          <select
            id="theme"
            value={config.global.themeId}
            onChange={(e) => updateGlobal({ themeId: e.target.value as ThemeId })}
          >
            <option value="obsidian-dark">Obsidian dark</option>
            <option value="obsidian-light">Obsidian light</option>
            <option value="graphite">Graphite</option>
          </select>
        </div>

        <div className="field">
          <label>
            <input
              type="checkbox"
              checked={config.global.layout?.gridFullWidth !== false}
              onChange={(e) =>
                updateGlobal({
                  layout: {
                    ...(config.global.layout ?? {}),
                    gridFullWidth: e.target.checked,
                  },
                })
              }
            />{" "}
            Grid uses full window width
          </label>
        </div>

        <div className="field">
          <label>
            <input
              type="checkbox"
              checked={config.global.layout?.squareCells !== false}
              onChange={(e) =>
                updateGlobal({
                  layout: {
                    ...(config.global.layout ?? {}),
                    squareCells: e.target.checked,
                  },
                })
              }
            />{" "}
            Square grid cells (row height = column width)
          </label>
        </div>

        {config.global.layout?.squareCells === false ? (
          <div className="field">
            <label htmlFor="rowh">Fixed row height (px)</label>
            <input
              id="rowh"
              type="number"
              min={40}
              max={96}
              step={1}
              value={config.global.layout?.rowHeightPx ?? 52}
              onChange={(e) => {
                const n = Number(e.target.value);
                updateGlobal({
                  layout: {
                    ...(config.global.layout ?? {}),
                    rowHeightPx: Number.isFinite(n) ? Math.min(96, Math.max(40, Math.round(n))) : 52,
                  },
                });
              }}
            />
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Used only when square cells are off (rectangular rows).
            </span>
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="bg">Background image URL</label>
          <input
            id="bg"
            value={config.global.backgroundImageUrl ?? ""}
            placeholder="https://…"
            onChange={(e) => updateGlobal({ backgroundImageUrl: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="engine">Search engine</label>
          <select
            id="engine"
            value={config.global.search.engineId}
            onChange={(e) =>
              updateGlobal({
                search: { ...config.global.search, engineId: e.target.value as SearchEngineId },
              })
            }
          >
            {(Object.keys(searchEngineLabels) as SearchEngineId[]).map((id) => (
              <option key={id} value={id}>
                {searchEngineLabels[id]}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>
            <input
              type="checkbox"
              checked={config.global.search.autoFocusOnLoad}
              onChange={(e) =>
                updateGlobal({
                  search: { ...config.global.search, autoFocusOnLoad: e.target.checked },
                })
              }
            />{" "}
            Auto-focus search on startup
          </label>
        </div>

        <div className="field">
          <label>
            <input
              type="checkbox"
              checked={config.global.search.openInNewTab}
              onChange={(e) =>
                updateGlobal({
                  search: { ...config.global.search, openInNewTab: e.target.checked },
                })
              }
            />{" "}
            Open search results in a new tab
          </label>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "0.5rem 0" }} />

        <h2 style={{ fontSize: "0.95rem", margin: "0 0 0.25rem" }}>Import / export</h2>
        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0 0 0.5rem" }}>
          Export saves the current profile (shared or the profile token in use) as JSON. Import
          replaces that same profile on the server after validation.
        </p>
        <div className="sheet-actions" style={{ marginTop: 0, flexWrap: "wrap" }}>
          <button
            type="button"
            className="primary"
            disabled={importBusy}
            onClick={() => {
              const blob = new Blob([JSON.stringify(config, null, 2)], {
                type: "application/json;charset=utf-8",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `homepage-config-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export JSON
          </button>
          <button
            type="button"
            disabled={importBusy}
            onClick={() => importInputRef.current?.click()}
          >
            Import JSON…
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                const raw = JSON.parse(await file.text()) as unknown;
                if (!raw || typeof raw !== "object") {
                  window.alert("The file must contain a JSON object.");
                  return;
                }
                let next = normalizeConfig(raw as AppConfig);
                if (!Array.isArray(next.workspaces) || next.workspaces.length === 0) {
                  window.alert("Import must include at least one workspace.");
                  return;
                }
                if (!next.workspaces.some((ws) => ws.id === next.activeWorkspaceId)) {
                  next = { ...next, activeWorkspaceId: next.workspaces[0].id };
                }
                if (
                  !window.confirm(
                    "Replace the current dashboard with this file and save it to the server?",
                  )
                ) {
                  return;
                }
                setImportBusy(true);
                setSelectedWidgetId(null);
                const saved = await saveConfig(next);
                replaceConfig(saved);
                onClose();
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                window.alert(`Import failed: ${msg}`);
              } finally {
                setImportBusy(false);
              }
            }}
          />
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "0.5rem 0" }} />

        <h2 style={{ fontSize: "0.95rem", margin: "0 0 0.25rem" }}>Profile (isolated config)</h2>
        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0 0 0.5rem" }}>
          Each profile uses its own file on the server (
          <code>data/profiles/&lt;hash&gt;/config.json</code>). Leave empty to use the shared{" "}
          <code>config.json</code> with everyone who has no profile token.
        </p>

        <div className="field">
          <label htmlFor="profile-token">Profile token</label>
          <input
            id="profile-token"
            readOnly
            value={getProfileToken()}
            placeholder="(none — shared config)"
            onFocus={(e) => e.target.select()}
          />
        </div>

        <div className="sheet-actions" style={{ marginTop: 0 }}>
          <button
            type="button"
            className="primary"
            onClick={() => {
              const t = generateProfileToken();
              setProfileToken(t);
              void reload();
            }}
          >
            New profile token
          </button>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(getProfileToken()).then(
                () => window.alert("Copied profile token."),
                () => window.alert("Could not copy — select the field and copy manually."),
              );
            }}
            disabled={!profileActive}
          >
            Copy token
          </button>
        </div>

        <div className="sheet-actions">
          <button
            type="button"
            onClick={() => {
              if (
                !window.confirm(
                  "Clear profile and use shared server config.json? This browser will load the shared dashboard.",
                )
              ) {
                return;
              }
              setProfileToken("");
              void reload();
            }}
            disabled={!profileActive}
          >
            Use shared config
          </button>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "0.5rem 0" }} />

        <div className="field">
          <label htmlFor="token">Server API token (optional)</label>
          <input
            id="token"
            type="password"
            autoComplete="off"
            value={token}
            placeholder="Bearer token if CONFIG_TOKEN is set"
            onChange={(e) => setToken(e.target.value)}
          />
        </div>

        <div className="sheet-actions">
          <button
            type="button"
            className="primary"
            onClick={() => {
              setStoredToken(token.trim());
              void reload();
              onClose();
            }}
          >
            Save API token &amp; reload
          </button>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </aside>
    </>
  );
}

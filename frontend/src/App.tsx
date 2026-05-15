import { useState } from "react";
import { ConfigProvider, useAppConfig } from "./configContext";
import { WorkspaceBar } from "./components/WorkspaceBar";
import { DashboardGrid } from "./components/DashboardGrid";
import { SettingsSheet } from "./components/SettingsSheet";
import { WidgetInspector } from "./components/WidgetInspector";

function cssBackgroundImage(url: string): string {
  return `url("${url.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}")`;
}

function Shell() {
  const { config, saveError, unauthorized, editMode, setEditMode } = useAppConfig();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const bg = config.global.backgroundImageUrl?.trim();
  const shellStyle =
    bg && bg.length > 0 ? { backgroundImage: cssBackgroundImage(bg) } : undefined;
  const gridFullWidth = config.global.layout?.gridFullWidth !== false;

  return (
    <div className="app-shell" data-theme={config.global.themeId} style={shellStyle}>
      <div className={`app-inner${gridFullWidth ? " app-inner--fullwidth" : ""}`}>
        <div className="app-stack">
          <div className="top-bar">
            <button
              type="button"
              className="icon-btn"
              aria-label="Settings"
              title="Settings"
              onClick={() => setSettingsOpen(true)}
            >
              ⚙
            </button>
            <button
              type="button"
              className="icon-btn"
              data-active={editMode}
              aria-label="Edit layout"
              title="Edit layout"
              onClick={() => setEditMode(!editMode)}
            >
              ✎
            </button>
          </div>

          {unauthorized ? (
            <div className="banner">
              API returned unauthorized. Open settings and set the bearer token if{" "}
              <code>CONFIG_TOKEN</code> is enabled on the server.
            </div>
          ) : null}

          {saveError ? (
            <div className="banner">
              {saveError}
            </div>
          ) : null}

          <WorkspaceBar />
          <DashboardGrid />
        </div>
        <WidgetInspector />
        <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ConfigProvider>
      <Shell />
    </ConfigProvider>
  );
}

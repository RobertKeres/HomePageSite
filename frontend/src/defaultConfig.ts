import type { AppConfig } from "./types";
import { GRID_COLUMNS } from "./gridConstants";
import { randomUUID } from "./uuid";

function sanitizeIconWidgets(c: AppConfig): AppConfig {
  return {
    ...c,
    workspaces: c.workspaces.map((ws) => ({
      ...ws,
      widgets: ws.widgets.map((w) => {
        if (w.type !== "iconLink") return w;
        const side = Math.max(1, Math.min(w.w, w.h, GRID_COLUMNS - w.x));
        return { ...w, w: side, h: side };
      }),
    })),
  };
}

/** Legacy v1 used a 12-column grid; v2 doubles all widget coordinates. */
function migrateConfigGridV1ToV2(c: AppConfig): AppConfig {
  if (c.version >= 2) return c;
  return {
    ...c,
    version: 2,
    workspaces: c.workspaces.map((ws) => ({
      ...ws,
      widgets: ws.widgets.map((w) => ({
        ...w,
        x: w.x * 2,
        y: w.y * 2,
        w: w.w * 2,
        h: w.h * 2,
      })),
    })),
  };
}

/** v3 doubles again for a 48-column grid (was 24 in v2). */
function migrateConfigGridV2ToV3(c: AppConfig): AppConfig {
  if (c.version >= 3) return c;
  return {
    ...c,
    version: 3,
    workspaces: c.workspaces.map((ws) => ({
      ...ws,
      widgets: ws.widgets.map((w) => ({
        ...w,
        x: w.x * 2,
        y: w.y * 2,
        w: w.w * 2,
        h: w.h * 2,
      })),
    })),
  };
}

export function createDefaultConfig(): AppConfig {
  const wid = "default";
  return {
    version: 3,
    activeWorkspaceId: wid,
    workspaces: [
      {
        id: wid,
        name: "Default",
        widgets: [
          {
            id: randomUUID(),
            type: "header",
            x: 0,
            y: 0,
            w: GRID_COLUMNS,
            h: 8,
            text: "Home",
            fontSize: "2rem",
          },
          {
            id: randomUUID(),
            type: "search",
            x: 8,
            y: 8,
            w: 32,
            h: 8,
          },
        ],
      },
    ],
    global: {
      themeId: "obsidian-dark",
      backgroundImageUrl: "",
      search: {
        engineId: "duckduckgo",
        autoFocusOnLoad: false,
        openInNewTab: false,
      },
      layout: {
        gridFullWidth: true,
        rowHeightPx: 52,
        squareCells: true,
      },
    },
  };
}

/** Merge defaults for new global fields (older saved configs). */
export function normalizeConfig(c: AppConfig): AppConfig {
  const d = createDefaultConfig();
  const migrated = sanitizeIconWidgets(migrateConfigGridV2ToV3(migrateConfigGridV1ToV2(c)));
  return {
    ...migrated,
    global: {
      ...d.global,
      ...migrated.global,
      search: { ...d.global.search, ...migrated.global.search },
      layout: { ...d.global.layout, ...migrated.global.layout },
    },
  };
}

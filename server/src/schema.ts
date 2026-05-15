import { z } from "zod";

/** Horizontal grid columns. v1=12, v2=24, v3+=48 (each step doubles stored coords). */
export const GRID_COLUMNS = 48;

const gridCoords = {
  x: z.number().int().min(0).max(GRID_COLUMNS - 1),
  y: z.number().int().min(0).max(4095),
  w: z.number().int().min(1).max(GRID_COLUMNS),
  h: z.number().int().min(1).max(240),
} as const;

export const headerWidgetSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("header"),
    ...gridCoords,
    text: z.string(),
    fontSize: z.string().min(1),
  })
  .strict();

const dataImageBase64 = z
  .string()
  .max(500_000)
  .regex(/^data:image\/(png|jpeg|jpg|gif|webp);base64,/);

export const iconLinkWidgetSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("iconLink"),
    ...gridCoords,
    url: z.string().url(),
    title: z.string().optional(),
    iconUrl: z.preprocess(
      (v) => (v === "" ? undefined : v),
      z.string().url().optional(),
    ),
    /** Inline uploaded image (data URL). Takes precedence over iconUrl, then site favicon. */
    iconUploadDataUrl: dataImageBase64.optional(),
  })
  .strict();

export const listLinkItemSchema = z
  .object({
    url: z.string().url(),
    label: z.string().min(1),
    iconUrl: z.preprocess(
      (v) => (v === "" ? undefined : v),
      z.string().url().optional(),
    ),
    iconUploadDataUrl: dataImageBase64.optional(),
  })
  .strict();

export const listLinkWidgetSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("listLink"),
    ...gridCoords,
    fontSize: z.preprocess(
      (v) => (v === "" ? undefined : v),
      z.string().min(1).max(48).optional(),
    ),
    items: z.array(listLinkItemSchema).max(200),
  })
  .strict();

export const searchWidgetSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("search"),
    ...gridCoords,
  })
  .strict();

export const widgetSchema = z.discriminatedUnion("type", [
  headerWidgetSchema,
  iconLinkWidgetSchema,
  listLinkWidgetSchema,
  searchWidgetSchema,
]);

export const workspaceSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(120),
    widgets: z.array(widgetSchema).max(500),
  })
  .strict();

export const globalSettingsSchema = z
  .object({
    themeId: z.enum(["obsidian-dark", "obsidian-light", "graphite"]),
    backgroundImageUrl: z.union([z.string().url(), z.literal("")]).optional(),
    search: z
      .object({
        engineId: z.enum(["duckduckgo", "google", "bing"]),
        autoFocusOnLoad: z.boolean(),
        openInNewTab: z.boolean(),
      })
      .strict(),
    layout: z
      .object({
        /** When true (default), grid spans full window width; when false, max-width box. */
        gridFullWidth: z.boolean(),
        /** Row height in px when squareCells is false. */
        rowHeightPx: z.number().int().min(40).max(96).optional(),
        /** When true (default), row height equals column width (width÷grid columns) so units are square. */
        squareCells: z.boolean().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const appConfigSchema = z
  .object({
    version: z.number().int().min(1),
    workspaces: z.array(workspaceSchema).min(1).max(50),
    activeWorkspaceId: z.string().min(1),
    global: globalSettingsSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    const ids = new Set(data.workspaces.map((w) => w.id));
    if (!ids.has(data.activeWorkspaceId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "activeWorkspaceId must match a workspace id",
        path: ["activeWorkspaceId"],
      });
    }
    for (const ws of data.workspaces) {
      const widgetIds = new Set<string>();
      for (const w of ws.widgets) {
        if (widgetIds.has(w.id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicate widget id in workspace ${ws.id}: ${w.id}`,
            path: ["workspaces"],
          });
          return;
        }
        widgetIds.add(w.id);
        if (w.x + w.w > GRID_COLUMNS) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Widget ${w.id} extends past last column`,
            path: ["workspaces"],
          });
        }
        if (w.type === "iconLink" && w.w !== w.h) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Icon link widget ${w.id} must be square (w === h)`,
            path: ["workspaces"],
          });
        }
      }
    }
  });

export type AppConfig = z.infer<typeof appConfigSchema>;
export type Widget = z.infer<typeof widgetSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;

/** Merge defaults so older on-disk JSON still validates. */
function sanitizeWorkspacesGrid(ws: unknown): unknown {
  if (!Array.isArray(ws)) return ws;
  return ws.map((space) => {
    if (!space || typeof space !== "object") return space;
    const s = { ...(space as Record<string, unknown>) };
    const widgets = s.widgets;
    if (!Array.isArray(widgets)) return s;
    s.widgets = widgets.map((w) => {
      if (!w || typeof w !== "object") return w;
      const widget = { ...(w as Record<string, unknown>) };
      if (widget.type === "iconLink") {
        const x = Number(widget.x);
        const wi = Number(widget.w);
        const hi = Number(widget.h);
        if (Number.isFinite(x) && Number.isFinite(wi) && Number.isFinite(hi)) {
          const side = Math.max(1, Math.min(wi, hi, GRID_COLUMNS - Math.max(0, Math.floor(x))));
          widget.w = side;
          widget.h = side;
        }
      }
      return widget;
    });
    return s;
  });
}

export function migrateRawConfig(body: unknown): unknown {
  if (!body || typeof body !== "object") return body;
  const c = { ...(body as Record<string, unknown>) };
  const global = { ...((c.global as Record<string, unknown>) ?? {}) };
  const search = { ...((global.search as Record<string, unknown>) ?? {}) };
  if (typeof search.openInNewTab !== "boolean") search.openInNewTab = false;
  global.search = search;
  const layout = { ...((global.layout as Record<string, unknown>) ?? {}) };
  if (typeof layout.gridFullWidth !== "boolean") layout.gridFullWidth = true;
  if (typeof layout.rowHeightPx !== "number" || !Number.isFinite(layout.rowHeightPx)) {
    layout.rowHeightPx = 52;
  } else {
    layout.rowHeightPx = Math.min(96, Math.max(40, Math.round(Number(layout.rowHeightPx))));
  }
  if (typeof layout.squareCells !== "boolean") layout.squareCells = true;
  global.layout = layout;
  c.global = global;

  let version = typeof c.version === "number" && Number.isFinite(c.version) ? Math.floor(c.version) : 1;
  let workspaces = c.workspaces;
  if (version < 2 && Array.isArray(workspaces)) {
    workspaces = workspaces.map((space) => {
      if (!space || typeof space !== "object") return space;
      const s = { ...(space as Record<string, unknown>) };
      const widgets = s.widgets;
      if (!Array.isArray(widgets)) return s;
      s.widgets = widgets.map((w) => {
        if (!w || typeof w !== "object") return w;
        const widget = { ...(w as Record<string, unknown>) };
        for (const key of ["x", "y", "w", "h"] as const) {
          const n = Number(widget[key]);
          if (Number.isFinite(n)) widget[key] = Math.round(n * 2);
        }
        return widget;
      });
      return s;
    });
    version = 2;
  }
  if (version < 3 && Array.isArray(workspaces)) {
    workspaces = workspaces.map((space) => {
      if (!space || typeof space !== "object") return space;
      const s = { ...(space as Record<string, unknown>) };
      const widgets = s.widgets;
      if (!Array.isArray(widgets)) return s;
      s.widgets = widgets.map((w) => {
        if (!w || typeof w !== "object") return w;
        const widget = { ...(w as Record<string, unknown>) };
        for (const key of ["x", "y", "w", "h"] as const) {
          const n = Number(widget[key]);
          if (Number.isFinite(n)) widget[key] = Math.round(n * 2);
        }
        return widget;
      });
      return s;
    });
    version = 3;
  }
  c.version = version;
  c.workspaces = sanitizeWorkspacesGrid(workspaces);
  return c;
}

export function defaultConfig(): AppConfig {
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
            id: crypto.randomUUID(),
            type: "header",
            x: 0,
            y: 0,
            w: GRID_COLUMNS,
            h: 8,
            text: "Home",
            fontSize: "2rem",
          },
          {
            id: crypto.randomUUID(),
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

export type ThemeId = "obsidian-dark" | "obsidian-light" | "graphite";

export type SearchEngineId = "duckduckgo" | "google" | "bing";

export type GlobalSettings = {
  themeId: ThemeId;
  backgroundImageUrl?: string;
  search: {
    engineId: SearchEngineId;
    autoFocusOnLoad: boolean;
    openInNewTab: boolean;
  };
  layout?: {
    gridFullWidth: boolean;
    rowHeightPx?: number;
    squareCells?: boolean;
  };
};

export type HeaderWidget = {
  id: string;
  type: "header";
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  fontSize: string;
};

export type IconLinkWidget = {
  id: string;
  type: "iconLink";
  x: number;
  y: number;
  w: number;
  h: number;
  url: string;
  title?: string;
  /** Remote icon URL (optional). Ignored if iconUploadDataUrl is set. */
  iconUrl?: string;
  /** Inline image from upload (data URL). Takes precedence over iconUrl; otherwise favicon is used. */
  iconUploadDataUrl?: string;
};

export type ListLinkItem = {
  url: string;
  label: string;
  iconUrl?: string;
  /** Inline image from upload (data URL). Takes precedence over iconUrl for the row icon. */
  iconUploadDataUrl?: string;
};

export type ListLinkWidget = {
  id: string;
  type: "listLink";
  x: number;
  y: number;
  w: number;
  h: number;
  /** Row text size (CSS length, e.g. 0.875rem, 15px). Defaults in the UI when unset. */
  fontSize?: string;
  items: ListLinkItem[];
};

export type SearchWidget = {
  id: string;
  type: "search";
  x: number;
  y: number;
  w: number;
  h: number;
};

export type Widget = HeaderWidget | IconLinkWidget | ListLinkWidget | SearchWidget;

export type Workspace = {
  id: string;
  name: string;
  widgets: Widget[];
};

export type AppConfig = {
  /** Schema revision: v2 = 24-col, v3 = 48-col (v1 = 12-col; coordinates migrate on load). */
  version: number;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  global: GlobalSettings;
};

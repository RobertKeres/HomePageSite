import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AppConfig, Widget, Workspace } from "./types";
import { fetchConfig, saveConfig, saveConfigFlush } from "./api";
import { normalizeConfig } from "./defaultConfig";

type Ctx = {
  config: AppConfig;
  loading: boolean;
  saveError: string | null;
  unauthorized: boolean;
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  selectedWidgetId: string | null;
  setSelectedWidgetId: (id: string | null) => void;
  setConfig: (next: AppConfig) => void;
  updateWidget: (id: string, patch: Partial<Widget>) => void;
  removeWidget: (id: string) => void;
  addWidget: (w: Widget) => void;
  setActiveWorkspace: (id: string) => void;
  addWorkspace: () => void;
  updateGlobal: (patch: Partial<AppConfig["global"]>) => void;
  reload: () => Promise<void>;
  /** Replace config and mark it as already persisted (e.g. after import). */
  replaceConfig: (next: AppConfig) => void;
};

const ConfigContext = createContext<Ctx | null>(null);

function findWorkspace(config: AppConfig, id: string): Workspace | undefined {
  return config.workspaces.find((w) => w.id === id);
}

function mapWorkspace(
  config: AppConfig,
  wsId: string,
  fn: (ws: Workspace) => Workspace,
): AppConfig {
  return {
    ...config,
    workspaces: config.workspaces.map((w) => (w.id === wsId ? fn(w) : w)),
  };
}

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [editMode, setEditModeState] = useState(false);
  const setEditMode = useCallback((v: boolean) => {
    setEditModeState(v);
    if (!v) setSelectedWidgetId(null);
  }, []);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);

  const lastSaved = useRef("");
  const skipDebounce = useRef(true);
  const debounceTimerRef = useRef(0);
  const configRef = useRef<AppConfig | null>(null);
  if (config) configRef.current = config;
  else configRef.current = null;

  const load = useCallback(async () => {
    setLoading(true);
    setSaveError(null);
    try {
      const { config: c, unauthorized: u } = await fetchConfig();
      let next = c;
      const repaired =
        next.workspaces.length > 0 && !findWorkspace(next, next.activeWorkspaceId);
      if (repaired) {
        next = { ...next, activeWorkspaceId: next.workspaces[0].id };
      }
      setConfigState(normalizeConfig(next));
      setUnauthorized(u);
      lastSaved.current = JSON.stringify(repaired ? c : next);
      skipDebounce.current = true;
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setConfig = useCallback((next: AppConfig) => {
    skipDebounce.current = false;
    setConfigState(next);
  }, []);

  const replaceConfig = useCallback((next: AppConfig) => {
    const n = normalizeConfig(next);
    window.clearTimeout(debounceTimerRef.current);
    skipDebounce.current = true;
    lastSaved.current = JSON.stringify(n);
    setSaveError(null);
    setUnauthorized(false);
    setConfigState(n);
  }, []);

  useEffect(() => {
    const flushIfDirty = () => {
      window.clearTimeout(debounceTimerRef.current);
      const c = configRef.current;
      if (!c) return;
      const s = JSON.stringify(c);
      if (s === lastSaved.current) return;
      saveConfigFlush(c);
      lastSaved.current = s;
    };
    window.addEventListener("pagehide", flushIfDirty);
    const onVis = () => {
      if (document.visibilityState === "hidden") flushIfDirty();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", flushIfDirty);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    if (!config || skipDebounce.current) {
      skipDebounce.current = false;
      return;
    }
    const serialized = JSON.stringify(config);
    if (serialized === lastSaved.current) return;

    window.clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = window.setTimeout(() => {
      void (async () => {
        try {
          const saved = await saveConfig(config);
          lastSaved.current = JSON.stringify(saved);
          setSaveError(null);
          setUnauthorized(false);
          setConfigState(saved);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Save failed";
          setSaveError(msg);
          if (msg.toLowerCase().includes("unauthorized")) setUnauthorized(true);
        }
      })();
    }, 650);

    return () => window.clearTimeout(debounceTimerRef.current);
  }, [config]);

  const resolvedWorkspaceId = useMemo(() => {
    if (!config) return null;
    if (findWorkspace(config, config.activeWorkspaceId)) return config.activeWorkspaceId;
    return config.workspaces[0]?.id ?? null;
  }, [config]);

  const activeWs = useMemo(() => {
    if (!config || !resolvedWorkspaceId) return null;
    return findWorkspace(config, resolvedWorkspaceId) ?? null;
  }, [config, resolvedWorkspaceId]);

  const updateWidget = useCallback(
    (id: string, patch: Partial<Widget>) => {
      if (!config || !activeWs || !resolvedWorkspaceId) return;
      const wsId = resolvedWorkspaceId;
      setConfig(
        mapWorkspace(config, wsId, (ws) => ({
          ...ws,
          widgets: ws.widgets.map((w) => (w.id === id ? ({ ...w, ...patch } as Widget) : w)),
        })),
      );
    },
    [config, activeWs, resolvedWorkspaceId, setConfig],
  );

  const removeWidget = useCallback(
    (id: string) => {
      if (!config || !activeWs || !resolvedWorkspaceId) return;
      const wsId = resolvedWorkspaceId;
      setSelectedWidgetId((cur) => (cur === id ? null : cur));
      setConfig(
        mapWorkspace(config, wsId, (ws) => ({
          ...ws,
          widgets: ws.widgets.filter((w) => w.id !== id),
        })),
      );
    },
    [config, activeWs, resolvedWorkspaceId, setConfig],
  );

  const addWidget = useCallback(
    (w: Widget) => {
      if (!config || !activeWs || !resolvedWorkspaceId) return;
      const wsId = resolvedWorkspaceId;
      setConfig(
        mapWorkspace(config, wsId, (ws) => ({
          ...ws,
          widgets: [...ws.widgets, w],
        })),
      );
      setSelectedWidgetId(w.id);
    },
    [config, activeWs, resolvedWorkspaceId, setConfig],
  );

  const setActiveWorkspace = useCallback(
    (id: string) => {
      if (!config) return;
      if (!findWorkspace(config, id)) return;
      setSelectedWidgetId(null);
      setConfig({ ...config, activeWorkspaceId: id });
    },
    [config, setConfig],
  );

  const addWorkspace = useCallback(() => {
    if (!config) return;
    const id = crypto.randomUUID();
    const n = config.workspaces.length + 1;
    setConfig({
      ...config,
      workspaces: [...config.workspaces, { id, name: `Workspace ${n}`, widgets: [] }],
      activeWorkspaceId: id,
    });
    setSelectedWidgetId(null);
  }, [config, setConfig]);

  const updateGlobal = useCallback(
    (patch: Partial<AppConfig["global"]>) => {
      if (!config) return;
      setConfig({
        ...config,
        global: {
          ...config.global,
          ...patch,
          ...(patch.search
            ? { search: { ...config.global.search, ...patch.search } }
            : {}),
          ...(patch.layout
            ? {
                layout: {
                  gridFullWidth: config.global.layout?.gridFullWidth !== false,
                  rowHeightPx: config.global.layout?.rowHeightPx ?? 52,
                  squareCells: config.global.layout?.squareCells !== false,
                  ...patch.layout,
                },
              }
            : {}),
        },
      });
    },
    [config, setConfig],
  );

  const value = useMemo<Ctx | null>(() => {
    if (!config || !activeWs) return null;
    return {
      config,
      loading,
      saveError,
      unauthorized,
      editMode,
      setEditMode,
      selectedWidgetId,
      setSelectedWidgetId,
      setConfig,
      updateWidget,
      removeWidget,
      addWidget,
      setActiveWorkspace,
      addWorkspace,
      updateGlobal,
      reload: load,
      replaceConfig,
    };
  }, [
    config,
    activeWs,
    loading,
    saveError,
    unauthorized,
    editMode,
    selectedWidgetId,
    setConfig,
    replaceConfig,
    updateWidget,
    removeWidget,
    addWidget,
    setActiveWorkspace,
    addWorkspace,
    updateGlobal,
    load,
  ]);

  if (!value) {
    return (
      <div className="app-shell" data-theme="obsidian-dark">
        <div className="app-inner">{loading ? "Loading…" : saveError ?? "No config"}</div>
      </div>
    );
  }

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useAppConfig(): Ctx {
  const v = useContext(ConfigContext);
  if (!v) throw new Error("useAppConfig outside provider");
  return v;
}

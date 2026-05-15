import { GRID_COLUMNS } from "../gridConstants";
import type { Widget } from "../types";
import { useAppConfig } from "../configContext";
import { ListLinkEditor } from "./ListLinkEditor";

function num(v: string, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function WidgetInspector() {
  const { config, editMode, selectedWidgetId, updateWidget, setSelectedWidgetId } = useAppConfig();

  const workspace = config.workspaces.find((x) => x.id === config.activeWorkspaceId);
  const w = selectedWidgetId ? workspace?.widgets.find((x) => x.id === selectedWidgetId) : undefined;

  if (!editMode || !selectedWidgetId || !w) return null;

  const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

  const onXYWH = (patch: Partial<Pick<Widget, "x" | "y" | "w" | "h">>) => {
    const next = {
      x: patch.x !== undefined ? patch.x : w.x,
      y: patch.y !== undefined ? patch.y : w.y,
      w: patch.w !== undefined ? patch.w : w.w,
      h: patch.h !== undefined ? patch.h : w.h,
    };
    const fw = clamp(Math.floor(next.w), 1, GRID_COLUMNS);
    const fh = clamp(Math.floor(next.h), 1, 240);
    const fx = clamp(Math.floor(next.x), 0, GRID_COLUMNS - fw);
    const fy = clamp(Math.floor(next.y), 0, 4095);
    if (w.type === "iconLink") {
      const side = Math.max(1, Math.min(fw, fh, GRID_COLUMNS - fx));
      updateWidget(w.id, { x: fx, y: fy, w: side, h: side });
      return;
    }
    updateWidget(w.id, { x: fx, y: fy, w: fw, h: fh });
  };

  return (
    <div className="inspector" role="region" aria-label="Widget inspector">
      <h3>Edit widget ({w.type})</h3>
      <div className="inspector-grid">
        <div className="field">
          <label>X</label>
          <input
            type="number"
            min={0}
            max={Math.max(0, GRID_COLUMNS - w.w)}
            value={w.x}
            onChange={(e) => onXYWH({ x: num(e.target.value, w.x) })}
          />
        </div>
        <div className="field">
          <label>Y</label>
          <input
            type="number"
            min={0}
            value={w.y}
            onChange={(e) => onXYWH({ y: num(e.target.value, w.y) })}
          />
        </div>
        <div className="field">
          <label>W</label>
          <input
            type="number"
            min={1}
            max={GRID_COLUMNS}
            value={w.w}
            onChange={(e) => onXYWH({ w: num(e.target.value, w.w) })}
          />
        </div>
        <div className="field">
          <label>H</label>
          <input
            type="number"
            min={1}
            value={w.h}
            onChange={(e) => onXYWH({ h: num(e.target.value, w.h) })}
          />
        </div>

        {w.type === "header" && (
          <>
            <div className="field full">
              <label>Text</label>
              <input
                value={w.text}
                onChange={(e) => updateWidget(w.id, { text: e.target.value })}
              />
            </div>
            <div className="field full">
              <label>Font size (e.g. 2rem, 32px)</label>
              <input
                value={w.fontSize}
                onChange={(e) => updateWidget(w.id, { fontSize: e.target.value })}
              />
            </div>
          </>
        )}

        {w.type === "iconLink" && (
          <>
            <div className="field full">
              <label>URL</label>
              <input
                value={w.url}
                onChange={(e) => updateWidget(w.id, { url: e.target.value })}
              />
            </div>
            <div className="field full">
              <label>Title (optional)</label>
              <input
                value={w.title ?? ""}
                onChange={(e) => updateWidget(w.id, { title: e.target.value || undefined })}
              />
            </div>
            <div className="field full">
              <label htmlFor="icon-upload">Icon image (optional upload)</label>
              <input
                id="icon-upload"
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  if (file.size > 350_000) {
                    window.alert("Image too large (max ~350 KB).");
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => {
                    const data = reader.result;
                    if (typeof data === "string") {
                      updateWidget(w.id, { iconUploadDataUrl: data, iconUrl: undefined });
                    }
                  };
                  reader.readAsDataURL(file);
                }}
              />
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0.25rem 0 0" }}>
                Upload overrides the icon URL. If neither is set, the site favicon is used automatically.
              </p>
              {w.iconUploadDataUrl ? (
                <button
                  type="button"
                  className="icon-btn"
                  style={{ width: "auto", marginTop: "0.35rem", padding: "0 0.5rem", fontSize: "0.75rem" }}
                  onClick={() => updateWidget(w.id, { iconUploadDataUrl: undefined })}
                >
                  Remove uploaded icon
                </button>
              ) : null}
            </div>
            <div className="field full">
              <label>Icon URL (optional link to image)</label>
              <input
                value={w.iconUrl ?? ""}
                placeholder="https://…"
                onChange={(e) =>
                  updateWidget(w.id, { iconUrl: e.target.value.trim() || undefined })
                }
              />
            </div>
          </>
        )}

        {w.type === "listLink" && (
          <>
            <div className="field full">
              <label htmlFor="list-font-size">Row font size (CSS)</label>
              <input
                id="list-font-size"
                type="text"
                value={w.fontSize ?? ""}
                placeholder="0.875rem"
                onChange={(e) =>
                  updateWidget(w.id, { fontSize: e.target.value.trim() || undefined })
                }
              />
            </div>
            <div className="field full">
              <label>List links</label>
              <ListLinkEditor items={w.items} onChange={(items) => updateWidget(w.id, { items })} />
            </div>
          </>
        )}
      </div>
      <div className="row-actions">
        <button type="button" onClick={() => setSelectedWidgetId(null)}>
          Deselect
        </button>
      </div>
    </div>
  );
}

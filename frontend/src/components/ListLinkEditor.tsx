import type { ListLinkItem } from "../types";

const MAX_ICON_BYTES = 350_000;

function isProbablyValidUrl(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function ListLinkEditor({
  items,
  onChange,
}: {
  items: ListLinkItem[];
  onChange: (next: ListLinkItem[]) => void;
}) {
  const patch = (index: number, patchItem: Partial<ListLinkItem>) => {
    const next = items.map((it, i) => (i === index ? { ...it, ...patchItem } : it));
    onChange(next);
  };

  const move = (index: number, delta: -1 | 1) => {
    const j = index + delta;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[index], next[j]] = [next[j], next[index]];
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const add = () => {
    onChange([...items, { url: "https://example.com", label: "New link" }]);
  };

  return (
    <div className="list-editor">
      {items.length === 0 ? (
        <p className="list-editor-empty">No links yet. Add one below.</p>
      ) : null}
      <div className="list-editor-rows">
        {items.map((it, index) => (
          <div key={index} className="list-editor-row">
            <div className="list-editor-row__toolbar">
              <span className="list-editor-row__n">{index + 1}</span>
              <button
                type="button"
                className="list-editor-icon-btn"
                aria-label="Move up"
                title="Move up"
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="list-editor-icon-btn"
                aria-label="Move down"
                title="Move down"
                disabled={index === items.length - 1}
                onClick={() => move(index, 1)}
              >
                ↓
              </button>
              <button
                type="button"
                className="list-editor-remove"
                aria-label="Remove item"
                title="Remove"
                onClick={() => remove(index)}
              >
                Remove
              </button>
            </div>
            <label className="list-editor-label">
              <span>Name</span>
              <input
                type="text"
                value={it.label}
                placeholder="Label"
                onChange={(e) => patch(index, { label: e.target.value })}
                onBlur={() => {
                  if (!it.label.trim()) patch(index, { label: "Untitled" });
                }}
              />
            </label>
            <label className="list-editor-label">
              <span>URL</span>
              <input
                type="url"
                value={it.url}
                placeholder="https://…"
                onChange={(e) => patch(index, { url: e.target.value })}
                onBlur={() => {
                  const t = it.url.trim();
                  if (t && !isProbablyValidUrl(t)) {
                    window.alert("Use a valid http(s) URL so the config can save.");
                  }
                }}
              />
            </label>
            <label className="list-editor-label">
              <span>Icon image URL (optional)</span>
              <input
                type="url"
                value={it.iconUrl ?? ""}
                placeholder="https://…/icon.png"
                onChange={(e) =>
                  patch(index, {
                    iconUrl: e.target.value.trim() || undefined,
                  })
                }
              />
            </label>
            <label className="list-editor-label">
              <span>Icon upload (optional)</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  if (file.size > MAX_ICON_BYTES) {
                    window.alert("Image too large (max ~350 KB).");
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => {
                    const data = reader.result;
                    if (typeof data === "string") {
                      patch(index, { iconUploadDataUrl: data, iconUrl: undefined });
                    }
                  };
                  reader.readAsDataURL(file);
                }}
              />
              {it.iconUploadDataUrl ? (
                <button
                  type="button"
                  className="list-editor-clear-upload"
                  onClick={() => patch(index, { iconUploadDataUrl: undefined })}
                >
                  Remove uploaded icon
                </button>
              ) : null}
            </label>
            <p className="list-editor-hint">
              If no icon URL or upload is set, the site favicon is used automatically.
            </p>
          </div>
        ))}
      </div>
      <button type="button" className="list-editor-add" onClick={add}>
        + Add link
      </button>
    </div>
  );
}

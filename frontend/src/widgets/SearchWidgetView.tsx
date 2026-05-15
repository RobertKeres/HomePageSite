import { useEffect, useRef } from "react";
import type { SearchEngineId } from "../types";
import { searchUrl } from "../searchEngines";

type Props = {
  autoFocus: boolean;
  engineId: SearchEngineId;
  openInNewTab: boolean;
  editMode?: boolean;
};

export function SearchWidgetView({
  autoFocus,
  engineId,
  openInNewTab,
  editMode = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const didFocus = useRef(false);

  useEffect(() => {
    if (!autoFocus || didFocus.current) return;
    didFocus.current = true;
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [autoFocus]);

  const submit = () => {
    const q = inputRef.current?.value.trim() ?? "";
    if (!q) return;
    const url = searchUrl(engineId, q);
    if (openInNewTab) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      window.location.assign(url);
    }
  };

  return (
    <div className={`search-widget${editMode ? " search-widget--edit-target" : ""}`}>
      <div className="search-row">
        <input
          ref={inputRef}
          type="search"
          name="q"
          placeholder="Search…"
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        <button type="button" onClick={submit}>
          Go
        </button>
      </div>
    </div>
  );
}

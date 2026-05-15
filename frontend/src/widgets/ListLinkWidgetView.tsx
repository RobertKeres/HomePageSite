import type { ListLinkWidget } from "../types";
import { faviconCandidatesForSite } from "../favicon";
import { FaviconImg } from "./FaviconImg";

export function ListLinkWidgetView({
  w,
  editMode = false,
}: {
  w: ListLinkWidget;
  editMode?: boolean;
}) {
  return (
    <div className={`list-link-outer${editMode ? " list-link-outer--edit-target" : ""}`}>
      <div className="list-link" style={{ fontSize: w.fontSize?.trim() || "0.875rem" }}>
        {w.items.map((it, idx) => {
          const upload = it.iconUploadDataUrl?.trim();
          const urls = upload
            ? [upload]
            : [...(it.iconUrl?.trim() ? [it.iconUrl.trim()] : []), ...faviconCandidatesForSite(it.url)];
          return (
            <a key={`${idx}-${it.label}`} className="list-row" href={it.url} rel="noreferrer" target="_blank">
              {urls.length > 0 ? <FaviconImg urls={urls} className="list-row__img" /> : <span aria-hidden>·</span>}
              <span>{it.label}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

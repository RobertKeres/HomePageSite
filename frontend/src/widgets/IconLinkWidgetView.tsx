import type { IconLinkWidget } from "../types";
import { faviconCandidatesForSite } from "../favicon";
import { FaviconImg } from "./FaviconImg";

export function IconLinkWidgetView({
  w,
  editMode = false,
}: {
  w: IconLinkWidget;
  editMode?: boolean;
}) {
  const upload = w.iconUploadDataUrl?.trim();
  const iconUrls = upload
    ? []
    : [...(w.iconUrl?.trim() ? [w.iconUrl.trim()] : []), ...faviconCandidatesForSite(w.url)];

  const label = w.title?.trim() || w.url;

  return (
    <a
      className={`icon-link icon-link--tile${editMode ? " icon-link--edit-target" : ""}`}
      href={w.url}
      rel="noreferrer"
      target="_blank"
      aria-label={label}
    >
      <span className="icon-link__figure" aria-hidden>
        {upload ? (
          <img src={upload} alt="" loading="lazy" decoding="async" />
        ) : iconUrls.length > 0 ? (
          <FaviconImg urls={iconUrls} className="icon-link__img" />
        ) : (
          <span className="icon-link__emoji" aria-hidden>
            🔗
          </span>
        )}
      </span>
      {w.title ? <span className="icon-link__title">{w.title}</span> : null}
    </a>
  );
}

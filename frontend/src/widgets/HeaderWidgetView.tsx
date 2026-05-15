import type { HeaderWidget } from "../types";

export function HeaderWidgetView({
  w,
  editMode = false,
}: {
  w: HeaderWidget;
  editMode?: boolean;
}) {
  return (
    <h1
      className={`header-widget${editMode ? " header-widget--edit-target" : ""}`}
      style={{ fontSize: w.fontSize }}
    >
      {w.text}
    </h1>
  );
}

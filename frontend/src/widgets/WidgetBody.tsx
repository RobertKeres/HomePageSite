import type { SearchEngineId, Widget } from "../types";
import { HeaderWidgetView } from "./HeaderWidgetView";
import { IconLinkWidgetView } from "./IconLinkWidgetView";
import { ListLinkWidgetView } from "./ListLinkWidgetView";
import { SearchWidgetView } from "./SearchWidgetView";

export function WidgetBody({
  w,
  editMode = false,
  searchAutoFocus,
  searchEngineId,
  searchOpenInNewTab,
}: {
  w: Widget;
  editMode?: boolean;
  searchAutoFocus: boolean;
  searchEngineId: SearchEngineId;
  searchOpenInNewTab: boolean;
}) {
  switch (w.type) {
    case "header":
      return <HeaderWidgetView w={w} editMode={editMode} />;
    case "iconLink":
      return <IconLinkWidgetView w={w} editMode={editMode} />;
    case "listLink":
      return <ListLinkWidgetView w={w} editMode={editMode} />;
    case "search":
      return (
        <SearchWidgetView
          autoFocus={searchAutoFocus}
          engineId={searchEngineId}
          openInNewTab={searchOpenInNewTab}
          editMode={editMode}
        />
      );
    default:
      return null;
  }
}

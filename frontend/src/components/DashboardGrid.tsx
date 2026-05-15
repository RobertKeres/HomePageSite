import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useAppConfig } from "../configContext";
import { GRID_COLUMNS } from "../gridConstants";
import type { Widget } from "../types";
import { randomUUID } from "../uuid";
import { WidgetBody } from "../widgets/WidgetBody";

type GridMetrics = { stepY: number; fillRows: number };

function snapResizeSize(
  type: Widget["type"],
  x0: number,
  w0: number,
  h0: number,
  dw: number,
  dh: number,
): { w: number; h: number } {
  const maxW = GRID_COLUMNS - x0;
  if (type === "iconLink") {
    const d = Math.abs(dw) >= Math.abs(dh) ? dw : dh;
    const s = Math.max(1, Math.min(w0 + d, maxW));
    return { w: s, h: s };
  }
  const nw = Math.max(1, Math.min(w0 + dw, maxW));
  const nh = Math.min(240, Math.max(1, h0 + dh));
  return { w: nw, h: nh };
}

function WidgetDragRoot({
  id,
  editMode,
  children,
}: {
  id: string;
  editMode: boolean;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled: !editMode,
  });
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px,${transform.y}px,0)`,
        zIndex: isDragging ? 10 : undefined,
      }
    : undefined;

  return (
    <div ref={setNodeRef} className="widget-dnd-root" style={style}>
      {editMode ? (
        <button
          type="button"
          className="widget-move-rail"
          {...listeners}
          {...attributes}
          aria-label="Drag to move widget"
        >
          <span className="widget-move-rail__grip" aria-hidden>
            ⋮⋮
          </span>
          <span className="widget-move-rail__hint">Move</span>
        </button>
      ) : null}
      {children}
    </div>
  );
}

export function DashboardGrid() {
  const {
    config,
    editMode,
    selectedWidgetId,
    setSelectedWidgetId,
    updateWidget,
    addWidget,
    removeWidget,
  } = useAppConfig();

  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number; id: string } | null>(null);
  const stepRef = useRef(40);
  const [addOpen, setAddOpen] = useState(false);
  const [metrics, setMetrics] = useState<GridMetrics | null>(null);
  const updateWidgetRef = useRef(updateWidget);
  updateWidgetRef.current = updateWidget;

  const squareCells = config.global.layout?.squareCells !== false;
  const rowHFixed = config.global.layout?.rowHeightPx ?? 52;

  const ws = useMemo(() => {
    const found = config.workspaces.find((w) => w.id === config.activeWorkspaceId);
    return found ?? config.workspaces[0];
  }, [config]);

  const maxRow = useMemo(() => {
    if (!ws || ws.widgets.length === 0) return 8;
    return Math.max(8, ...ws.widgets.map((w) => w.y + w.h));
  }, [ws]);

  const firstSearchId = useMemo(
    () => ws?.widgets.find((w) => w.type === "search")?.id,
    [ws?.widgets],
  );

  const stepY = squareCells && metrics ? metrics.stepY : rowHFixed;
  const fillRows = metrics?.fillRows ?? maxRow;
  const minRows = Math.max(maxRow, fillRows);
  const minHeightPx = minRows * stepY;

  stepRef.current = stepY;

  useEffect(() => {
    const scroll = scrollRef.current;
    const grid = gridRef.current;
    if (!scroll || !grid) return;

    const measure = () => {
      const rect = grid.getBoundingClientRect();
      const colW = rect.width / GRID_COLUMNS;
      if (colW <= 0) return;

      if (squareCells) {
        const cell = Math.max(16, Math.floor(colW));
        const fill = Math.max(1, Math.ceil(scroll.clientHeight / cell));
        setMetrics((prev) =>
          prev && prev.stepY === cell && prev.fillRows === fill
            ? prev
            : { stepY: cell, fillRows: fill },
        );
      } else {
        const h = rowHFixed;
        const fill = Math.max(1, Math.ceil(scroll.clientHeight / h));
        setMetrics((prev) =>
          prev && prev.stepY === h && prev.fillRows === fill ? prev : { stepY: h, fillRows: fill },
        );
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(scroll);
    ro.observe(grid);
    return () => ro.disconnect();
  }, [squareCells, rowHFixed, maxRow, config.global.layout?.gridFullWidth]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  useEffect(() => {
    if (!editMode) setAddOpen(false);
  }, [editMode]);

  const beginResize = (widget: Widget, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const { w: w0, h: h0, x: x0, type, id } = widget;

    const onMove = (ev: PointerEvent) => {
      const grid = gridRef.current;
      if (!grid) return;
      const colW = grid.getBoundingClientRect().width / GRID_COLUMNS;
      if (colW <= 0) return;
      const rowH = stepRef.current;
      const dw = Math.round((ev.clientX - startX) / colW);
      const dh = Math.round((ev.clientY - startY) / rowH);
      const next = snapResizeSize(type, x0, w0, h0, dw, dh);
      updateWidgetRef.current(id, next);
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  const onDragStart = (e: DragStartEvent) => {
    if (!ws) return;
    const id = String(e.active.id);
    const w = ws.widgets.find((x) => x.id === id);
    if (!w) return;
    dragStart.current = { id, x: w.x, y: w.y };
  };

  const onDragEnd = (e: DragEndEvent) => {
    if (!ws) return;
    const start = dragStart.current;
    dragStart.current = null;
    if (!start || String(e.active.id) !== start.id) return;
    const w = ws.widgets.find((x) => x.id === start.id);
    if (!w) return;
    const grid = gridRef.current;
    if (!grid) return;
    const colW = grid.getBoundingClientRect().width / GRID_COLUMNS;
    if (colW <= 0) return;
    const dx = Math.round(e.delta.x / colW);
    const dy = Math.round(e.delta.y / stepRef.current);
    const nx = Math.max(0, Math.min(GRID_COLUMNS - w.w, start.x + dx));
    const ny = Math.max(0, start.y + dy);
    if (nx !== w.x || ny !== w.y) updateWidget(w.id, { x: nx, y: ny });
  };

  const nextY = () =>
    ws && ws.widgets.length ? Math.max(...ws.widgets.map((x) => x.y + x.h)) : 0;

  const pushWidget = (widget: Widget) => {
    addWidget(widget);
    setAddOpen(false);
  };

  if (!ws) {
    return (
      <p className="banner" role="alert">
        Config has no workspaces. Add one in <code>config.json</code> or reset the data file.
      </p>
    );
  }

  return (
    <>
      <div className="dashboard-scroll" ref={scrollRef}>
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div
            ref={gridRef}
            className={`dashboard-grid${editMode ? " edit" : ""}${
              config.global.layout?.gridFullWidth !== false ? " dashboard-grid--full" : ""
            }`}
            style={
              {
                gridAutoRows: `${stepY}px`,
                minHeight: `${minHeightPx}px`,
                "--row-h": `${stepY}px`,
                "--grid-cols": GRID_COLUMNS,
              } as CSSProperties
            }
          >
            {ws.widgets.map((w) => (
              <div
                key={w.id}
                className={`widget-cell${selectedWidgetId === w.id ? " selected" : ""}`}
                style={{
                  gridColumn: `${w.x + 1} / span ${w.w}`,
                  gridRow: `${w.y + 1} / span ${w.h}`,
                }}
                onClickCapture={(ev) => {
                  if (!editMode) return;
                  const t = ev.target as HTMLElement;
                  if (t.closest(".widget-remove")) return;
                  if (t.closest(".widget-resize-handle")) return;
                  if (t.closest("a, input, textarea, button")) ev.preventDefault();
                }}
                onClick={(e) => {
                  if (!editMode) return;
                  if ((e.target as HTMLElement).closest(".widget-resize-handle")) return;
                  setSelectedWidgetId(w.id);
                }}
              >
                {editMode ? (
                  <button
                    type="button"
                    className="widget-remove"
                    aria-label="Remove widget"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      removeWidget(w.id);
                    }}
                  >
                    ×
                  </button>
                ) : null}
                <WidgetDragRoot id={w.id} editMode={editMode}>
                  <div
                    className={`widget-body-slot${editMode ? " widget-body-slot--edit" : ""}`}
                  >
                    <WidgetBody
                      w={w}
                      editMode={editMode}
                      searchAutoFocus={
                        config.global.search.autoFocusOnLoad &&
                        w.type === "search" &&
                        w.id === firstSearchId
                      }
                      searchEngineId={config.global.search.engineId}
                      searchOpenInNewTab={config.global.search.openInNewTab}
                    />
                  </div>
                  {editMode ? (
                    <button
                      type="button"
                      className="widget-resize-handle"
                      aria-label="Resize widget"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => beginResize(w, e)}
                    />
                  ) : null}
                </WidgetDragRoot>
              </div>
            ))}
          </div>
        </DndContext>
      </div>

      {editMode ? (
        <div className="fab-add">
          {addOpen ? (
            <div className="add-menu">
              <button
                type="button"
                onClick={() =>
                  pushWidget({
                    id: randomUUID(),
                    type: "header",
                    x: 0,
                    y: nextY(),
                    w: GRID_COLUMNS,
                    h: 8,
                    text: "New header",
                    fontSize: "1.5rem",
                  })
                }
              >
                Header
              </button>
              <button
                type="button"
                onClick={() =>
                  pushWidget({
                    id: randomUUID(),
                    type: "iconLink",
                    x: 0,
                    y: nextY(),
                    w: 8,
                    h: 8,
                    url: "https://example.com",
                    title: "Example",
                  })
                }
              >
                Icon link
              </button>
              <button
                type="button"
                onClick={() =>
                  pushWidget({
                    id: randomUUID(),
                    type: "listLink",
                    x: 0,
                    y: nextY(),
                    w: 24,
                    h: 16,
                    fontSize: "0.875rem",
                    items: [
                      {
                        url: "https://example.com",
                        label: "Example",
                      },
                    ],
                  })
                }
              >
                List
              </button>
              <button
                type="button"
                onClick={() =>
                  pushWidget({
                    id: randomUUID(),
                    type: "search",
                    x: 8,
                    y: nextY(),
                    w: 32,
                    h: 8,
                  })
                }
              >
                Search
              </button>
            </div>
          ) : null}
          <button type="button" aria-label="Add widget" onClick={() => setAddOpen((o) => !o)}>
            +
          </button>
        </div>
      ) : null}
    </>
  );
}

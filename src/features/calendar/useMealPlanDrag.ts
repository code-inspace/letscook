import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import { MealPlan } from "./types";

const LONG_PRESS_MS = 350;
const MOVE_TOLERANCE_PX = 8;
const EDGE_SCROLL_ZONE_PX = 90;

export interface DragState {
  plan: MealPlan;
  x: number;
  y: number;
  /** Date key (YYYY-MM-DD) of the day cell under the finger */
  overDate: string | null;
}

/**
 * Long-press-then-drag for meal plans in the month grid.
 *
 * HTML5 drag & drop doesn't work with touch on iOS, so this uses pointer events:
 * a still press of 350 ms picks the meal up (a quick swipe still scrolls the
 * page), then the day under the finger is found via `data-date-key`. Page
 * scrolling is blocked while dragging and the page auto-scrolls near the edges.
 */
export function useMealPlanDrag(onDrop: (plan: MealPlan, date: string) => void) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const pressRef = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number } | null>(null);
  const suppressClickRef = useRef(false);
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;

  const setDragState = (next: DragState | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  const cancelPress = () => {
    if (pressRef.current) clearTimeout(pressRef.current.timer);
    pressRef.current = null;
  };

  const dateAt = (x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    return el?.closest<HTMLElement>("[data-date-key]")?.dataset.dateKey ?? null;
  };

  // iOS only stops the page from scrolling if touchmove is cancelled (non-passive listener)
  useEffect(() => {
    const blockScroll = (e: TouchEvent) => {
      if (dragRef.current) e.preventDefault();
    };
    document.addEventListener("touchmove", blockScroll, { passive: false });
    return () => document.removeEventListener("touchmove", blockScroll);
  }, []);

  useEffect(() => {
    if (!drag) return;

    let frame = 0;
    const autoScroll = () => {
      const current = dragRef.current;
      if (!current) return;
      let dy = 0;
      if (current.y < EDGE_SCROLL_ZONE_PX) dy = -12;
      else if (current.y > window.innerHeight - EDGE_SCROLL_ZONE_PX - 60) dy = 12;
      if (dy) {
        window.scrollBy(0, dy);
        document.getElementById("app-root")?.scrollBy(0, dy);
        setDragState({ ...current, overDate: dateAt(current.x, current.y) });
      }
      frame = requestAnimationFrame(autoScroll);
    };
    frame = requestAnimationFrame(autoScroll);

    const onMove = (e: PointerEvent) => {
      const current = dragRef.current;
      if (!current) return;
      setDragState({ ...current, x: e.clientX, y: e.clientY, overDate: dateAt(e.clientX, e.clientY) });
    };
    const onUp = (e: PointerEvent) => {
      const current = dragRef.current;
      setDragState(null);
      if (!current) return;
      const target = dateAt(e.clientX, e.clientY);
      if (target && target !== current.plan.date) onDropRef.current(current.plan, target);
    };
    const onCancel = () => setDragState(null);

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
    // Re-subscribe only when a drag starts/stops, not on every move
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(drag)]);

  /** Spread on each draggable meal chip. */
  const bindDraggable = useCallback(
    (plan: MealPlan) => ({
      onPointerDown: (e: ReactPointerEvent) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        const { clientX: x, clientY: y } = e;
        suppressClickRef.current = false;
        cancelPress();
        pressRef.current = {
          x,
          y,
          timer: setTimeout(() => {
            pressRef.current = null;
            suppressClickRef.current = true;
            navigator.vibrate?.(10);
            setDragState({ plan, x, y, overDate: plan.date });
          }, LONG_PRESS_MS),
        };
      },
      onPointerMove: (e: ReactPointerEvent) => {
        const press = pressRef.current;
        if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > MOVE_TOLERANCE_PX) {
          cancelPress(); // the user is scrolling, not picking the meal up
        }
      },
      onPointerUp: cancelPress,
      onPointerCancel: cancelPress,
      onContextMenu: (e: ReactMouseEvent) => e.preventDefault(),
      style: { WebkitTouchCallout: "none" as const, touchAction: "manipulation" as const },
    }),
    []
  );

  /** Call at the top of the chip's onClick: true when the click ended a drag. */
  const consumeDragClick = useCallback(() => {
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
  }, []);

  return { drag, bindDraggable, consumeDragClick };
}

import { useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";

const CLOSE_DISTANCE = 110;

/**
 * Swipe-down-to-close for bottom sheets (like iOS). The gesture starts on the
 * sheet's handle / header only (touch-action: none there), so scrolling the
 * sheet's content is never hijacked.
 */
export function useSheetDrag(onClose: () => void) {
  const [dy, setDy] = useState(0);
  const [released, setReleased] = useState(false);
  const start = useRef<{ y: number; id: number } | null>(null);

  const end = () => {
    if (!start.current) return;
    start.current = null;
    setReleased(true);
    if (dy > CLOSE_DISTANCE) {
      navigator.vibrate?.(8);
      onClose();
    }
    setDy(0);
  };

  const handleProps = {
    style: { touchAction: "none" } as CSSProperties,
    onPointerDown: (e: ReactPointerEvent) => {
      // Buttons in the header keep their normal behaviour
      if ((e.target as HTMLElement).closest("button, a, input, textarea, select")) return;
      start.current = { y: e.clientY, id: e.pointerId };
      setReleased(false);
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    onPointerMove: (e: ReactPointerEvent) => {
      if (!start.current || start.current.id !== e.pointerId) return;
      setDy(Math.max(0, e.clientY - start.current.y));
    },
    onPointerUp: end,
    onPointerCancel: end,
  };

  const panelStyle: CSSProperties = {
    transform: dy ? `translateY(${dy}px)` : undefined,
    transition: released ? "transform 0.2s ease-out" : "none",
  };

  return { handleProps, panelStyle };
}

/** Visual grab bar shown at the top of bottom sheets. */
export const SHEET_GRABBER_CLASS = "mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200";

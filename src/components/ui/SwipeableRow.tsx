"use client";

import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { Check, Trash2, RotateCcw } from "lucide-react";

interface SwipeableRowProps {
  children: ReactNode;
  /** Swipe right (→) */
  onSwipeRight?: () => void;
  /** Swipe left (←) */
  onSwipeLeft?: () => void;
  rightLabel?: string;
  leftLabel?: string;
  /** Right action is "uncheck" (purchased items) */
  rightIsUndo?: boolean;
  className?: string;
}

const THRESHOLD = 72;

/**
 * Row that can be swiped horizontally to trigger an action (check / delete),
 * like iOS lists. Vertical scrolling is untouched (touch-action: pan-y) and a
 * plain tap still reaches the row's own buttons.
 */
export function SwipeableRow({
  children,
  onSwipeRight,
  onSwipeLeft,
  rightLabel = "Acheté",
  leftLabel = "Supprimer",
  rightIsUndo = false,
  className = "",
}: SwipeableRowProps) {
  const [dx, setDx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const horizontal = useRef(false);
  const swiped = useRef(false);

  const reset = () => {
    setAnimating(true);
    setDx(0);
    start.current = null;
    horizontal.current = false;
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      {/* Action backgrounds revealed by the swipe */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 flex items-center justify-between px-4 text-white text-xs font-extrabold ${
          dx > 0 ? (rightIsUndo ? "bg-slate-500" : "bg-[#5DB534]") : dx < 0 ? "bg-rose-500" : "bg-transparent"
        }`}
      >
        <span className={`flex items-center gap-1.5 transition-opacity ${dx > 24 ? "opacity-100" : "opacity-0"}`}>
          {rightIsUndo ? <RotateCcw className="w-4 h-4" /> : <Check className="w-4 h-4" strokeWidth={3} />}
          {rightLabel}
        </span>
        <span className={`flex items-center gap-1.5 transition-opacity ${dx < -24 ? "opacity-100" : "opacity-0"}`}>
          {leftLabel}
          <Trash2 className="w-4 h-4" />
        </span>
      </div>

      <div
        style={{
          transform: `translateX(${dx}px)`,
          transition: animating ? "transform 0.2s ease-out" : "none",
          touchAction: "pan-y",
        }}
        onTransitionEnd={() => setAnimating(false)}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
          horizontal.current = false;
          swiped.current = false;
          setAnimating(false);
        }}
        onPointerMove={(e) => {
          const s = start.current;
          if (!s || s.id !== e.pointerId) return;
          const mx = e.clientX - s.x;
          const my = e.clientY - s.y;
          if (!horizontal.current) {
            if (Math.abs(my) > 10 && Math.abs(my) > Math.abs(mx)) {
              start.current = null; // vertical scroll: let it go
              return;
            }
            if (Math.abs(mx) < 10) return;
            horizontal.current = true;
            (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          }
          const allowed = (mx > 0 && onSwipeRight) || (mx < 0 && onSwipeLeft) ? mx : mx / 4;
          setDx(Math.max(-140, Math.min(140, allowed)));
        }}
        onPointerUp={() => {
          if (!horizontal.current) {
            start.current = null;
            return;
          }
          swiped.current = true;
          if (dx >= THRESHOLD && onSwipeRight) {
            navigator.vibrate?.(10);
            onSwipeRight();
          } else if (dx <= -THRESHOLD && onSwipeLeft) {
            navigator.vibrate?.(10);
            onSwipeLeft();
          }
          reset();
        }}
        onPointerCancel={reset}
        onClickCapture={(e) => {
          // A swipe must not also count as a tap on the row
          if (swiped.current) {
            e.stopPropagation();
            e.preventDefault();
            swiped.current = false;
          }
        }}
        className="relative"
      >
        {children}
      </div>
    </div>
  );
}

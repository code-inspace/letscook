import React from "react";

interface StepMarkerProps {
  markerX?: number | null;
  markerY?: number | null;
}

export function StepMarker({ markerX, markerY }: StepMarkerProps) {
  if (markerX == null || markerY == null) return null;

  return (
    <div
      className="absolute w-3 h-3 rounded-full border-2 border-white flex items-center justify-center -translate-x-1/2 -translate-y-1/2 shadow-sm pointer-events-none z-20"
      style={{
        left: `${markerX}%`,
        top: `${markerY}%`,
      }}
    >
      <div className="w-1 h-1 bg-white rounded-full" />
    </div>
  );
}

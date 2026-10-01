import React from "react";

interface SkeletonProps {
  className?: string;
  shape?: "rectangle" | "circle" | "pill" | "rounded-2xl" | "rounded-xl";
}

export function Skeleton({
  className = "",
  shape = "rectangle",
}: SkeletonProps) {
  const shapeStyles = {
    rectangle: "rounded-lg",
    circle: "rounded-full",
    pill: "rounded-full",
    "rounded-2xl": "rounded-2xl",
    "rounded-xl": "rounded-xl",
  };

  return (
    <div
      className={`animate-pulse bg-[#F4F6F5] ${shapeStyles[shape]} ${className}`}
    />
  );
}

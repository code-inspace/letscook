import React from "react";

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  variant?: "light" | "medium" | "surface";
}

export function GlassPanel({
  children,
  className = "",
  variant = "medium",
}: GlassPanelProps) {
  const variantStyles = {
    light: "bg-white/15 border border-white/25 backdrop-blur-md",
    medium: "bg-white/20 border border-white/30 backdrop-blur-lg",
    surface: "bg-[#F4F6F5]/85 border border-white/40 backdrop-blur-md",
  };

  return (
    <div
      className={`${variantStyles[variant]} ${className}`}
    >
      {children}
    </div>
  );
}

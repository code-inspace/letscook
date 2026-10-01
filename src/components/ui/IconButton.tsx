import React from "react";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  variant?: "surface" | "glass" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function IconButton({
  children,
  className = "",
  variant = "surface",
  size = "md",
  ...props
}: IconButtonProps) {
  const sizeStyles = {
    sm: "w-9 h-9 text-sm",
    md: "w-10 h-10 text-base",
    lg: "w-12 h-12 text-lg",
  };

  const variantStyles = {
    surface: "bg-[#F1F2F2] hover:bg-[#EAEBEB] text-[#1C1C1C] shadow-[0_8px_24px_rgba(0,0,0,0.06)]",
    glass: "bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-md",
    ghost: "bg-transparent text-[#1C1C1C] hover:bg-black/5",
  };

  return (
    <button
      type="button"
      className={`rounded-xl flex items-center justify-center transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

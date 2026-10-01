import React from "react";
import Link from "next/link";

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  href?: string;
  className?: string;
}

export function PrimaryButton({
  children,
  href,
  className = "",
  ...props
}: PrimaryButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center rounded-full bg-[#5DB534] hover:bg-[#4FA12A] text-white font-normal transition-all active:scale-95 shadow-[0_10px_24px_rgba(93,181,52,0.35)] cursor-pointer text-[13px]";

  if (href) {
    return (
      <Link href={href} className={`${baseClasses} ${className}`}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={`${baseClasses} ${className}`} {...props}>
      {children}
    </button>
  );
}

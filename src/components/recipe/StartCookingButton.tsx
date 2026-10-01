import React from "react";
import Link from "next/link";

interface StartCookingButtonProps {
  recipeSlug: string;
  hasSteps: boolean;
  label?: string;
}

export function StartCookingButton({
  recipeSlug,
  hasSteps,
  label = "Let's Making",
}: StartCookingButtonProps) {
  if (!hasSteps) return null;

  return (
    <div className="fixed sm:absolute bottom-0 left-0 right-0 h-[100px] bg-gradient-to-t from-white via-white/80 to-transparent flex items-center justify-center pointer-events-none z-30 pb-4">
      <Link
        href={`/recipe/${recipeSlug}/step/1`}
        className="pointer-events-auto w-[130px] h-[46px] rounded-full bg-[#5DB534] hover:bg-[#4FA12A] flex items-center justify-center text-white text-[13px] font-normal transition-all active:scale-95 shadow-[0_10px_24px_rgba(93,181,52,0.35)] cursor-pointer"
      >
        {label}
      </Link>
    </div>
  );
}

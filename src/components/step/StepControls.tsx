import React from "react";
import Link from "next/link";

interface StepControlsProps {
  recipeSlug: string;
  order: number;
  totalSteps: number;
}

export function StepControls({
  recipeSlug,
  order,
  totalSteps,
}: StepControlsProps) {
  const isFirstStep = order <= 1;
  const isLastStep = order >= totalSteps;

  const prevHref = isFirstStep
    ? "#"
    : `/recipe/${recipeSlug}/step/${order - 1}`;

  const nextHref = isLastStep
    ? `/recipe/${recipeSlug}`
    : `/recipe/${recipeSlug}/step/${order + 1}`;

  return (
    <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-2 z-30 pointer-events-auto">
      {/* Progression indicator 10px white/70 */}
      <span className="text-[10px] font-normal text-white/70 tracking-widest uppercase">
        {order} / {totalSteps}
      </span>

      {/* Glass Pill Container */}
      <div className="p-1.5 rounded-full bg-white/15 border border-white/25 backdrop-blur-lg flex items-center gap-2 shadow-lg">
        {/* Previous Button */}
        {isFirstStep ? (
          <button
            type="button"
            disabled
            className="w-14 h-14 rounded-full bg-white/20 text-white/40 text-[11px] font-normal flex items-center justify-center cursor-not-allowed select-none"
          >
            Previous
          </button>
        ) : (
          <Link
            href={prevHref}
            className="w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 text-white/90 text-[11px] font-normal flex items-center justify-center transition-all active:scale-95"
          >
            Previous
          </Link>
        )}

        {/* Next / Finish Button */}
        <Link
          href={nextHref}
          className="w-14 h-14 rounded-full bg-[#5DB534] hover:bg-[#4FA12A] text-white text-[11px] font-normal flex items-center justify-center shadow-[0_4px_12px_rgba(93,181,52,0.35)] transition-all active:scale-95"
        >
          {isLastStep ? "Finish" : "Next"}
        </Link>
      </div>
    </div>
  );
}

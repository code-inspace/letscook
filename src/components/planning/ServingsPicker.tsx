"use client";

import { Users } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useReferenceServings } from "@/features/settings/referenceServings";

interface ServingsPickerProps {
  value: number;
  onChange: (servings: number) => void;
  /** Number of servings the recipe was written for */
  recipeServings: number;
}

/** Number of people for a planned meal: stepper + quick picks (reference servings / recipe default). */
export function ServingsPicker({ value, onChange, recipeServings }: ServingsPickerProps) {
  const { user } = useAuth();
  const referenceServings = useReferenceServings(user?.id);
  const quickPicks = [
    { servings: referenceServings, label: `${referenceServings} pers.` },
    { servings: recipeServings, label: `Recette (${recipeServings} pers.)` },
  ].filter((p, i, all) => all.findIndex((q) => q.servings === p.servings) === i);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-200">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, value - 1))}
          aria-label="Une personne de moins"
          className="w-10 h-10 rounded-lg bg-white shadow-xs font-extrabold text-slate-700 hover:bg-slate-100 active:scale-95 flex items-center justify-center cursor-pointer"
        >
          −
        </button>
        <span className="text-base font-extrabold text-[#181A20] flex items-center gap-2" aria-live="polite">
          <Users className="w-4 h-4 text-[#5DB534]" />
          {value} personne{value > 1 ? "s" : ""}
        </span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          aria-label="Une personne de plus"
          className="w-10 h-10 rounded-lg bg-white shadow-xs font-extrabold text-slate-700 hover:bg-slate-100 active:scale-95 flex items-center justify-center cursor-pointer"
        >
          +
        </button>
      </div>

      <div className="flex gap-2">
        {quickPicks.map((pick) => (
          <button
            key={pick.servings}
            type="button"
            onClick={() => onChange(pick.servings)}
            aria-pressed={value === pick.servings}
            className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95 ${
              value === pick.servings
                ? "bg-emerald-50 border-[#5DB534] text-[#5DB534]"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {pick.label}
          </button>
        ))}
      </div>
    </div>
  );
}

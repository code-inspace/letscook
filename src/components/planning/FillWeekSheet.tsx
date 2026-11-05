"use client";

import { useMemo, useState } from "react";
import { ChefHat, Loader2, RefreshCw, Sparkles, X, Check } from "lucide-react";
import { SHEET_GRABBER_CLASS, useSheetDrag } from "@/components/ui/useSheetDrag";
import type { Recipe } from "@/features/recipes/types";
import type { MealPlan } from "@/features/calendar/types";
import { DaySuggestion, nextCandidate, rankCandidates, suggestWeek } from "@/features/calendar/weekPlanner";
import { ServingsPicker } from "./ServingsPicker";

interface FillWeekSheetProps {
  recipes: Recipe[];
  plans: MealPlan[];
  defaultServings: number;
  onClose: () => void;
  onConfirm: (days: Array<{ date: string; recipe: Recipe }>, servings: number) => Promise<void>;
}

const dayLabel = (dateKey: string) => {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" });
};

/** Suggests a recipe for each free day of the coming week; each day can be swapped or skipped. */
export function FillWeekSheet({ recipes, plans, defaultServings, onClose, onConfirm }: FillWeekSheetProps) {
  const { handleProps, panelStyle } = useSheetDrag(onClose);
  const ranked = useMemo(() => rankCandidates(recipes, plans, new Date()), [recipes, plans]);
  const byId = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
  const [days, setDays] = useState<DaySuggestion[]>(() => suggestWeek(recipes, plans));
  const [servings, setServings] = useState(defaultServings);
  const [saving, setSaving] = useState(false);

  const chosen = days.filter((d) => d.recipeId);

  const swap = (date: string) =>
    setDays((prev) => {
      const used = new Set(prev.map((d) => d.recipeId).filter((id): id is string => Boolean(id)));
      return prev.map((d) => (d.date === date ? { ...d, recipeId: nextCandidate(ranked, d.recipeId, used) } : d));
    });

  const skip = (date: string) => setDays((prev) => prev.map((d) => (d.date === date ? { ...d, recipeId: null } : d)));

  const confirm = async () => {
    setSaving(true);
    try {
      await onConfirm(
        chosen.map((d) => ({ date: d.date, recipe: byId.get(d.recipeId!)! })).filter((d) => d.recipe),
        servings
      );
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fill-week-title"
        className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] p-5 shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-6 text-[#181A20]"
        style={panelStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Swipe down on the handle / header to close */}
        <div {...handleProps} className="-mt-2 pt-1 cursor-grab">
          <div className={SHEET_GRABBER_CLASS} aria-hidden="true" />
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 id="fill-week-title" className="text-base font-extrabold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#5DB534]" />
              Remplir la semaine
            </h3>
            <p className="text-[11px] text-[#6B7080] mt-0.5">
              Vos favoris et recettes les mieux notées, sans répéter ce que vous avez mangé récemment.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        </div>

        <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-2">
          {days.length === 0 && (
            <p className="py-10 text-center text-xs text-[#6B7080]">Tous les jours de la semaine sont déjà planifiés 👌</p>
          )}
          {days.map((d) => {
            const r = d.recipeId ? byId.get(d.recipeId) : null;
            return (
              <div
                key={d.date}
                className={`p-2.5 rounded-2xl border flex items-center gap-3 ${
                  r ? "bg-white border-slate-200" : "bg-slate-50 border-dashed border-slate-200"
                }`}
              >
                <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center">
                  {r?.imageUrl ? (
                    <img src={r.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ChefHat className="w-5 h-5 text-slate-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-[#5DB534] capitalize">{dayLabel(d.date)}</p>
                  <p className="text-xs font-extrabold truncate">{r ? r.title : "Pas de repas planifié"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => swap(d.date)}
                  aria-label={r ? "Proposer une autre recette" : "Proposer une recette"}
                  className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 cursor-pointer active:scale-95 shrink-0"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                {r && (
                  <button
                    type="button"
                    onClick={() => skip(d.date)}
                    aria-label="Ne rien planifier ce jour-là"
                    className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 cursor-pointer active:scale-95 shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}

          {days.length > 0 && (
            <div className="pt-2">
              <span className="block text-xs font-bold text-slate-600 mb-2">Personnes pour chaque repas</span>
              <ServingsPicker value={servings} onChange={setServings} recipeServings={servings} />
            </div>
          )}
        </div>

        {days.length > 0 && (
          <button
            type="button"
            onClick={confirm}
            disabled={chosen.length === 0 || saving}
            className="mt-3 w-full py-3.5 rounded-2xl bg-[#5DB534] hover:bg-[#4FA12A] disabled:opacity-40 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Planifier {chosen.length} repas
          </button>
        )}
      </div>
    </div>
  );
}

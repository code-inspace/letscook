"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Sparkles, X, ArrowRight, RefreshCw } from "lucide-react";
import { Ingredient, Recipe, DEFAULT_SERVINGS } from "@/features/recipes/types";
import {
  applySuggestions,
  IngredientSuggestion,
  ReviewedSuggestion,
  SuggestionDecision,
} from "@/features/recipes/recalibration";

interface RecalibrateSheetProps {
  recipe: Recipe;
  onClose: () => void;
  onApply: (ingredients: Ingredient[]) => Promise<void> | void;
}

const formatQty = (amount: number | null | undefined, unit?: string) => {
  const qty = amount ? `${amount}` : "";
  const text = [qty, unit || ""].filter(Boolean).join(" ");
  return text || "sans quantité";
};

/**
 * Asks the AI to recalibrate quantities/units, then lets the user review each
 * proposal: edit it by hand, accept or reject it. Nothing is saved until "Appliquer".
 */
export function RecalibrateSheet({ recipe, onClose, onApply }: RecalibrateSheetProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string>("");
  // amountText keeps what the user is typing ("1," → "1,5") while amount stays numeric
  const [items, setItems] = useState<Array<ReviewedSuggestion & { amountText: string }>>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    setError("");
    fetch("/api/ai/recalibrate-ingredients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        title: recipe.title,
        servingsBase: recipe.servingsBase || DEFAULT_SERVINGS,
        ingredients: recipe.ingredients.map((i) => ({
          name: i.name,
          amount: typeof i.amount === "number" && i.amount > 0 ? i.amount : null,
          unit: i.unit || "",
        })),
        steps: recipe.steps.map((s) => s.description),
      }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "L'analyse IA a échoué.");
        const suggestions: IngredientSuggestion[] = Array.isArray(data.suggestions) ? data.suggestions : [];
        setItems(
          suggestions.map((s) => ({
            ...s,
            amountText: s.amount === null ? "" : String(s.amount).replace(".", ","),
            decision: "pending" as SuggestionDecision,
          }))
        );
        setStatus("ready");
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err?.message || "L'analyse IA a échoué.");
        setStatus("error");
      });
    return () => controller.abort();
    // Only re-run on explicit retry; the recipe is fixed while the sheet is open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const update = (index: number, patch: Partial<ReviewedSuggestion & { amountText: string }>) =>
    setItems((prev) => prev.map((s) => (s.index === index ? { ...s, ...patch } : s)));

  const acceptedCount = items.filter((s) => s.decision === "accepted").length;

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await onApply(applySuggestions(recipe.ingredients, items));
      onClose();
    } finally {
      setIsApplying(false);
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
        aria-labelledby="recalibrate-title"
        className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] p-5 shadow-2xl flex flex-col max-h-[88vh] animate-in slide-in-from-bottom-6 text-[#181A20]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 id="recalibrate-title" className="text-base font-extrabold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#5DB534]" />
              Recalibrage des ingrédients
            </h3>
            <p className="text-[11px] text-[#8E929E] mt-0.5">
              Quantités de base pour {recipe.servingsBase || DEFAULT_SERVINGS} personne
              {(recipe.servingsBase || DEFAULT_SERVINGS) > 1 ? "s" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-2.5">
          {status === "loading" && (
            <div className="py-14 flex flex-col items-center text-center gap-2">
              <Loader2 className="w-7 h-7 animate-spin text-[#5DB534]" />
              <p className="text-xs font-bold text-slate-600">L&apos;IA vérifie les proportions…</p>
              <p className="text-[11px] text-[#8E929E]">Unités, quantités par personne, cohérence</p>
            </div>
          )}

          {status === "error" && (
            <div className="py-10 flex flex-col items-center text-center gap-3">
              <p className="text-xs font-bold text-rose-600">{error}</p>
              <button
                type="button"
                onClick={() => setAttempt((n) => n + 1)}
                className="px-4 py-2 rounded-full bg-slate-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Réessayer
              </button>
            </div>
          )}

          {status === "ready" && items.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm font-extrabold">Tout est cohérent 👌</p>
              <p className="text-xs text-[#8E929E] mt-1">
                L&apos;IA n&apos;a trouvé aucune quantité ou unité à corriger.
              </p>
            </div>
          )}

          {status === "ready" &&
            items.map((s) => {
              const original = recipe.ingredients[s.index];
              const tone =
                s.decision === "accepted"
                  ? "border-emerald-300 bg-emerald-50/50"
                  : s.decision === "rejected"
                  ? "border-slate-200 bg-slate-50 opacity-60"
                  : "border-slate-200 bg-white";
              return (
                <div key={s.index} className={`p-3 rounded-2xl border transition-all ${tone}`}>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="font-bold text-[#181A20] truncate">{original?.name}</span>
                    <span className="shrink-0">· {formatQty(original?.amount, original?.unit)}</span>
                    <ArrowRight className="w-3 h-3 shrink-0 text-[#5DB534]" />
                  </div>

                  <div className="mt-2 grid grid-cols-[1fr_64px_72px] gap-1.5">
                    <input
                      aria-label="Nom de l'ingrédient"
                      value={s.name}
                      disabled={s.decision === "rejected"}
                      onChange={(e) => update(s.index, { name: e.target.value, decision: "accepted" })}
                      className="min-w-0 bg-white px-2.5 py-2 rounded-xl text-xs font-bold border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5DB534]/30"
                    />
                    <input
                      aria-label="Quantité"
                      inputMode="decimal"
                      value={s.amountText}
                      disabled={s.decision === "rejected"}
                      onChange={(e) => {
                        const text = e.target.value;
                        if (!/^\d*[.,]?\d*$/.test(text)) return;
                        const n = text === "" ? null : Number(text.replace(",", "."));
                        update(s.index, {
                          amountText: text,
                          amount: n !== null && Number.isFinite(n) ? n : null,
                          decision: "accepted",
                        });
                      }}
                      className="min-w-0 bg-white px-2 py-2 rounded-xl text-xs font-bold text-center border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5DB534]/30"
                    />
                    <input
                      aria-label="Unité"
                      value={s.unit}
                      disabled={s.decision === "rejected"}
                      onChange={(e) => update(s.index, { unit: e.target.value, decision: "accepted" })}
                      className="min-w-0 bg-white px-2 py-2 rounded-xl text-xs font-bold text-center border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5DB534]/30"
                    />
                  </div>

                  {s.reason && <p className="mt-1.5 text-[11px] text-slate-500 leading-snug">{s.reason}</p>}

                  <div className="mt-2 flex gap-1.5">
                    <button
                      type="button"
                      aria-pressed={s.decision === "accepted"}
                      onClick={() =>
                        update(s.index, { decision: s.decision === "accepted" ? "pending" : "accepted" })
                      }
                      className={`flex-1 py-1.5 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 ${
                        s.decision === "accepted"
                          ? "bg-[#5DB534] text-white"
                          : "bg-emerald-50 text-[#5DB534] border border-emerald-200/70"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      {s.decision === "accepted" ? "Acceptée" : "Accepter"}
                    </button>
                    <button
                      type="button"
                      aria-pressed={s.decision === "rejected"}
                      onClick={() =>
                        update(s.index, { decision: s.decision === "rejected" ? "pending" : "rejected" })
                      }
                      className={`flex-1 py-1.5 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 ${
                        s.decision === "rejected"
                          ? "bg-slate-700 text-white"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                      {s.decision === "rejected" ? "Refusée" : "Refuser"}
                    </button>
                  </div>
                </div>
              );
            })}
        </div>

        {status === "ready" && items.length > 0 && (
          <div className="pt-3 mt-2 border-t border-slate-100 flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setItems((prev) =>
                  prev.map((s) => (s.decision === "rejected" ? s : { ...s, decision: "accepted" }))
                )
              }
              className="px-3.5 py-3 rounded-2xl bg-slate-100 text-xs font-extrabold text-slate-700 cursor-pointer active:scale-95"
            >
              Tout accepter
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={acceptedCount === 0 || isApplying}
              className="flex-1 py-3 rounded-2xl bg-[#5DB534] hover:bg-[#4FA12A] disabled:opacity-40 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95"
            >
              {isApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Appliquer {acceptedCount > 0 ? `(${acceptedCount})` : ""}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

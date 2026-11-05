"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Clock, ArrowRight, Star, ChefHat, ChevronLeft, X } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useRecipes } from "@/features/recipes/actions";
import { searchRecipes } from "@/features/recipes/search";
import { RECIPE_CATEGORIES } from "@/features/recipes/types";
import { BottomNav } from "@/components/layout/BottomNav";

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const { user } = useAuth();
  const recipes = useRecipes(user?.id) || [];
  const [query, setQuery] = useState<string>(initialQuery);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null) {
      setQuery(q);
    }
  }, [searchParams]);

  const [maxMinutes, setMaxMinutes] = useState<number | null>(null);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [category, setCategory] = useState("");
  const [have, setHave] = useState("");
  const [showHave, setShowHave] = useState(false);

  const results = useMemo(
    () => searchRecipes(recipes, { query, maxMinutes, onlyFavorites, category, have }),
    [recipes, query, maxMinutes, onlyFavorites, category, have]
  );
  const filtered = results.map((r) => r.recipe);
  const missingById = new Map(results.map((r) => [r.recipe.id, r.missing]));
  const hasFilters = Boolean(query || maxMinutes || onlyFavorites || category || have.trim());

  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border transition-all cursor-pointer active:scale-95 ${
      active ? "bg-[#181A20] text-white border-[#181A20]" : "bg-white text-slate-600 border-slate-200"
    }`;

  return (
    <div className="flex flex-col min-h-[100dvh] sm:min-h-[812px] bg-[#F8F9FB] pb-32 relative">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md px-5 pt-7 pb-3.5 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-[#5DB534] flex items-center justify-center border border-emerald-100 shadow-2xs">
            <Search className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-extrabold text-[#181A20] leading-tight">
              Recherche
            </h1>
            <span className="text-[10px] text-[#6B7080] font-medium">
              Par nom ou ingrédient
            </span>
          </div>
        </div>

        <div className="px-3 py-1 bg-slate-100/80 rounded-full text-slate-600 font-extrabold text-xs">
          {recipes.length} recettes
        </div>
      </header>

      <div className="px-5 pt-4 max-w-xl w-full mx-auto space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une recette, un ingrédient..."
            className="w-full h-12 pl-10 pr-10 rounded-2xl bg-white text-xs text-[#181A20] placeholder:text-[#6B7080] outline-none focus:ring-2 focus:ring-[#5DB534]/30 border border-slate-200/80 shadow-2xs transition-all"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 py-0.5">
          <button
            type="button"
            onClick={() => setShowHave((v) => !v)}
            aria-pressed={showHave || Boolean(have.trim())}
            className={chip(showHave || Boolean(have.trim()))}
          >
            🧺 Avec ce que j&apos;ai
          </button>
          {[20, 30, 45].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMaxMinutes(maxMinutes === m ? null : m)}
              aria-pressed={maxMinutes === m}
              className={chip(maxMinutes === m)}
            >
              ≤ {m} min
            </button>
          ))}
          <button
            type="button"
            onClick={() => setOnlyFavorites((v) => !v)}
            aria-pressed={onlyFavorites}
            className={chip(onlyFavorites)}
          >
            ♥ Favoris
          </button>
          {RECIPE_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(category === c.value ? "" : c.value)}
              aria-pressed={category === c.value}
              className={chip(category === c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>

        {(showHave || have.trim()) && (
          <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 space-y-1.5">
            <label htmlFor="have-input" className="block text-[11px] font-bold text-emerald-900">
              Ingrédients que vous avez (séparés par des virgules)
            </label>
            <input
              id="have-input"
              type="text"
              value={have}
              onChange={(e) => setHave(e.target.value)}
              placeholder="riz, poulet, oignon, crème…"
              className="w-full h-10 px-3 rounded-xl bg-white text-xs border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-[#5DB534]/30"
            />
            <p className="text-[10px] text-emerald-800">Sel, poivre, huile et eau sont considérés comme toujours là.</p>
          </div>
        )}

        {/* Results List */}
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#6B7080] px-1">
            <span>
              {hasFilters ? `Résultats (${filtered.length})` : `Toutes vos recettes (${recipes.length})`}
            </span>
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setMaxMinutes(null);
                  setOnlyFavorites(false);
                  setCategory("");
                  setHave("");
                  setShowHave(false);
                }}
                className="text-[#5DB534] cursor-pointer"
              >
                Effacer les filtres
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="py-14 px-6 text-center bg-white rounded-3xl border border-dashed border-slate-200">
              <ChefHat className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-[#181A20]">Aucune recette correspondante</p>
              <p className="text-[11px] text-[#6B7080] mt-1">
                Essayez un autre mot-clé ou importez une nouvelle fiche.
              </p>
            </div>
          ) : (
            filtered.map((recipe) => (
              <Link
                key={recipe.id}
                href={`/recipes/${recipe.id}`}
                className="p-3.5 rounded-2xl bg-white hover:border-slate-300 border border-slate-100 shadow-2xs transition-all flex items-center justify-between group active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 bg-slate-100 shadow-2xs border border-white">
                    {recipe.imageUrl ? (
                      <img
                        src={recipe.imageUrl}
                        alt={recipe.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-100" />
                    )}
                  </div>

                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#181A20] truncate max-w-[170px]">
                      {recipe.title}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-[#6B7080] mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-600" />
                        {recipe.prepTimeMinutes}m
                      </span>
                      {recipe.rating > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-0.5 text-[#181A20] font-bold">
                            <Star className="w-3 h-3 text-[#F5A623] fill-[#F5A623]" />
                            {Number(recipe.rating).toFixed(1)}
                          </span>
                        </>
                      )}
                    </div>
                    {missingById.get(recipe.id) && (
                      <span
                        className={`mt-1 text-[10px] font-bold truncate max-w-[200px] ${
                          missingById.get(recipe.id)!.length === 0 ? "text-emerald-700" : "text-amber-700"
                        }`}
                      >
                        {missingById.get(recipe.id)!.length === 0
                          ? "✓ Vous avez tout"
                          : `Il manque : ${missingById.get(recipe.id)!.join(", ")}`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-[#5DB534] shadow-2xs group-hover:translate-x-0.5 transition-transform">
                  <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="w-8 h-8 border-3 border-[#5DB534] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}

"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Clock, ArrowRight, Star, ChefHat, ChevronLeft, X } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useRecipes } from "@/features/recipes/actions";
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

  const filtered = recipes.filter((r) => {
    if (!query) return true;
    const q = query.toLowerCase().trim();
    const titleMatch = r.title.toLowerCase().includes(q);
    const ingMatch = r.ingredients?.some((ing) => ing.name.toLowerCase().includes(q));
    const catMatch = r.category?.toLowerCase().includes(q);
    return titleMatch || ingMatch || catMatch;
  });

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
            <span className="text-[10px] text-[#8E929E] font-medium">
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
            className="w-full h-12 pl-10 pr-10 rounded-2xl bg-white text-xs text-[#181A20] placeholder:text-[#8E929E] outline-none focus:ring-2 focus:ring-[#5DB534]/30 border border-slate-200/80 shadow-2xs transition-all"
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

        {/* Results List */}
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#8E929E] px-1">
            <span>
              {query ? `Résultats (${filtered.length})` : `Toutes vos recettes (${recipes.length})`}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="py-14 px-6 text-center bg-white rounded-3xl border border-dashed border-slate-200">
              <ChefHat className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-[#181A20]">Aucune recette correspondante</p>
              <p className="text-[11px] text-[#8E929E] mt-1">
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
                    <div className="flex items-center gap-2 text-[10px] text-[#8E929E] mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-600" />
                        {recipe.prepTimeMinutes}m
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5 text-[#181A20] font-bold">
                        <Star className="w-3 h-3 text-[#F5A623] fill-[#F5A623]" />
                        {Number(recipe.rating || 5).toFixed(1)}
                      </span>
                    </div>
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

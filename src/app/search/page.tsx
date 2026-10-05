"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Clock, ArrowRight, Star, ChefHat } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { Recipe } from "@/features/recipes/types";
import { fetchRecipesFromDb, getStoredRecipes } from "@/features/recipes/actions";
import { BottomNav } from "@/components/layout/BottomNav";

export default function SearchPage() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [query, setQuery] = useState<string>("");

  useEffect(() => {
    if (user?.id) {
      const cached = getStoredRecipes(user.id);
      setRecipes(cached);
      fetchRecipesFromDb(user.id).then((list) => setRecipes(list));
    }
  }, [user?.id]);

  const filtered = recipes.filter((r) => {
    if (!query) return true;
    const q = query.toLowerCase();
    const titleMatch = r.title.toLowerCase().includes(q);
    const ingMatch = r.ingredients?.some((ing) => ing.name.toLowerCase().includes(q));
    const catMatch = r.category?.toLowerCase().includes(q);
    return titleMatch || ingMatch || catMatch;
  });

  return (
    <div className="flex flex-col min-h-[100dvh] sm:min-h-[812px] bg-white px-5 pt-7 pb-24 relative overflow-y-auto">
      <h1 className="text-xl font-extrabold text-[#181A20]">Recherche</h1>

      {/* Search Input */}
      <div className="mt-4 relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une recette, un ingrédient..."
          className="w-full h-11 pl-10 pr-4 rounded-2xl bg-[#F4F6F5] text-xs text-[#181A20] placeholder:text-[#8E929E] outline-none focus:ring-2 focus:ring-[#5DB534]/30 border border-slate-100 transition-all"
        />
      </div>

      {/* Results */}
      <div className="mt-6 flex flex-col gap-3">
        <h2 className="text-xs font-bold text-[#181A20]">
          {query ? `Résultats (${filtered.length})` : `Toutes vos recettes (${recipes.length})`}
        </h2>

        {filtered.length === 0 ? (
          <div className="py-14 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <ChefHat className="w-9 h-9 text-slate-300 mx-auto mb-2" />
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
              className="p-3.5 rounded-2xl bg-[#F4F6F5] hover:bg-[#ECEEED] transition-all flex items-center justify-between group active:scale-98"
            >
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 bg-white shadow-2xs border border-white">
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

              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#5DB534] shadow-2xs group-hover:translate-x-0.5 transition-transform">
                <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
              </div>
            </Link>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Star, ArrowRight, Heart, Clock } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { Recipe } from "@/features/recipes/types";
import { fetchRecipesFromDb, getStoredRecipes } from "@/features/recipes/actions";
import { BottomNav } from "@/components/layout/BottomNav";

export default function FavoritesPage() {
  const { user, isLoading } = useAuth();
  const [favoriteRecipes, setFavoriteRecipes] = useState<Recipe[]>([]);
  const [isFetching, setIsFetching] = useState<boolean>(true);

  useEffect(() => {
    if (!user?.id) {
      if (!isLoading) setIsFetching(false);
      return;
    }

    const loadFavs = async () => {
      const cached = getStoredRecipes(user.id);
      const favs = cached.filter((r) => r.isFavorite);
      setFavoriteRecipes(favs);

      try {
        const all = await fetchRecipesFromDb(user.id);
        setFavoriteRecipes(all.filter((r) => r.isFavorite));
      } catch (err) {
        console.warn("loadFavs error:", err);
      } finally {
        setIsFetching(false);
      }
    };

    loadFavs();
  }, [user?.id, isLoading]);

  return (
    <div className="flex flex-col min-h-[100dvh] sm:min-h-[812px] bg-white px-5 pt-7 pb-24 relative overflow-y-auto">
      <div className="flex items-center gap-2">
        <Heart className="w-5 h-5 text-[#F2546E] fill-[#F2546E]" strokeWidth={1} />
        <h1 className="text-xl font-extrabold text-[#181A20]">Mes Favoris</h1>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {isFetching ? (
          <div className="py-16 text-center">
            <div className="w-7 h-7 border-2 border-[#5DB534] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-[#8E929E]">Chargement de vos favoris...</p>
          </div>
        ) : favoriteRecipes.length === 0 ? (
          <div className="py-16 text-center bg-slate-50/60 rounded-3xl p-6 border border-dashed border-slate-200">
            <Heart className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-[#181A20]">
              Aucune recette en favoris
            </p>
            <p className="text-[11px] text-[#8E929E] mt-1">
              Appuyez sur le cœur sur une fiche recette pour l'ajouter ici.
            </p>
          </div>
        ) : (
          favoriteRecipes.map((recipe) => (
            <Link
              key={recipe.id}
              href={`/recipes/${recipe.id}`}
              className="p-3.5 rounded-2xl bg-[#F4F6F5] hover:bg-[#ECEEED] transition-all flex items-center justify-between group active:scale-98"
            >
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 shadow-2xs bg-white border border-white">
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

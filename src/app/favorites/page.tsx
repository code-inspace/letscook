"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star, ArrowRight, Heart, Clock, ChevronLeft, Sparkles } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useRecipes } from "@/features/recipes/actions";
import { BottomNav } from "@/components/layout/BottomNav";

export default function FavoritesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const recipes = useRecipes(user?.id);
  const favoriteRecipes = useMemo(() => (recipes || []).filter((r) => r.isFavorite), [recipes]);
  const isFetching = recipes === null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50 pb-36">
      {/* Harmonized Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md px-5 pt-7 pb-3.5 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-100/60 shadow-2xs">
            <Heart className="w-4 h-4 fill-[#F2546E] text-[#F2546E]" strokeWidth={1} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-extrabold text-[#181A20] leading-tight">
              Mes Favoris
            </h1>
            <span className="text-[10px] text-[#8E929E] font-medium">
              {favoriteRecipes.length} recette{favoriteRecipes.length > 1 ? "s" : ""} coup de cœur
            </span>
          </div>
        </div>

        <div className="px-3 py-1.5 bg-rose-50 border border-rose-100/80 rounded-full text-rose-600 font-extrabold text-xs">
          {favoriteRecipes.length}
        </div>
      </header>

      <div className="max-w-2xl w-full mx-auto px-5 pt-4 space-y-3">
        {isFetching ? (
          <div className="py-16 text-center">
            <div className="w-7 h-7 border-2 border-[#5DB534] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-[#8E929E]">Chargement de vos favoris...</p>
          </div>
        ) : favoriteRecipes.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl p-6 border border-dashed border-slate-200">
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
              className="p-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-100 shadow-xs transition-all flex items-center justify-between group active:scale-98"
            >
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-2xl overflow-hidden shrink-0 shadow-xs bg-slate-100 border border-slate-100">
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
                </div>
              </div>

              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-[#5DB534] group-hover:translate-x-0.5 transition-transform">
                <ArrowRight className="w-4 h-4" strokeWidth={2} />
              </div>
            </Link>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}

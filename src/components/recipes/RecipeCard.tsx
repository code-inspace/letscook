"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Star, Clock, Flame } from "lucide-react";
import { Recipe } from "@/features/recipes/types";

interface RecipeCardProps {
  recipe: Recipe;
  featured?: boolean;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, featured = true }) => {
  const ingredientsCount = recipe.ingredients?.length || 0;
  const ratingValue = recipe.rating ? Number(recipe.rating).toFixed(1) : "5.0";

  return (
    <div className="relative group w-full flex flex-col items-center select-none">
      {/* Floating Circular Dish Plate with Cutout / Rim Effect */}
      <Link
        href={`/recipes/${recipe.id}`}
        className="w-full flex flex-col items-center relative transition-transform duration-500 hover:scale-[1.02] active:scale-[0.99]"
      >
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center my-2">
          {/* Ambient Glow / Dish Shadow */}
          <div className="absolute inset-4 rounded-full bg-black/10 blur-xl translate-y-6 scale-95 pointer-events-none" />
          
          {/* Plate Image with Circular Mask and Rim Highlight */}
          <div className="relative w-full h-full rounded-full p-2.5 bg-gradient-to-b from-white/90 via-white/50 to-slate-200/40 shadow-[0_16px_36px_rgba(0,0,0,0.12)] border border-white/80">
            <div className="w-full h-full rounded-full overflow-hidden relative shadow-inner bg-slate-100">
              <img
                src={recipe.imageUrl}
                alt={recipe.title}
                className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
              {/* Soft overlay gradient for realistic lighting */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-black/15 via-transparent to-white/20 pointer-events-none" />
            </div>
          </div>

          {/* Quick Info Badges floating near plate */}
          {recipe.spiceLevel && (
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full shadow-md border border-white text-[11px] font-semibold text-rose-600 flex items-center gap-1">
              <Flame className="w-3 h-3 fill-rose-500 text-rose-500" />
              <span>{recipe.spiceLevel}</span>
            </div>
          )}

          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full shadow-md border border-white text-[11px] font-semibold text-slate-700 flex items-center gap-1">
            <Clock className="w-3 h-3 text-emerald-600" />
            <span>{recipe.prepTimeMinutes}m</span>
          </div>
        </div>

        {/* Frosted Glass Overlay Card */}
        <div className="-mt-14 w-[90%] bg-white/85 backdrop-blur-xl p-4 rounded-[28px] shadow-[0_12px_32px_rgba(0,0,0,0.08)] border border-white flex items-center justify-between z-10 transition-all duration-300 group-hover:bg-white/95">
          <div className="flex-1 pr-3">
            <h3 className="text-base font-bold text-[#181A20] line-clamp-1 group-hover:text-[#1E9A4B] transition-colors">
              {recipe.title}
            </h3>
            
            <div className="flex items-center gap-4 mt-1.5 text-xs text-[#8E929E]">
              <span className="font-medium">{ingredientsCount} Ingredients</span>
              <div className="flex items-center gap-1 font-semibold text-[#181A20]">
                <Star className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                <span>{ratingValue}</span>
              </div>
            </div>
          </div>

          {/* Action Arrow Button */}
          <div className="w-10 h-10 rounded-full bg-[#22C55E] flex items-center justify-center text-white shadow-[0_4px_14px_rgba(34,197,94,0.45)] group-hover:scale-110 group-hover:bg-[#16A34A] transition-all duration-300 shrink-0">
            <ArrowRight className="w-5 h-5 stroke-[2.5]" />
          </div>
        </div>
      </Link>
    </div>
  );
};

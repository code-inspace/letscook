import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { FeaturedRecipeSummary } from "@/types";

interface FeaturedRecipeCardProps {
  recipe: FeaturedRecipeSummary | null;
}

export function FeaturedRecipeCard({ recipe }: FeaturedRecipeCardProps) {
  if (!recipe) {
    return (
      <section className="px-5 mt-10 flex flex-col items-center justify-center min-h-[280px]">
        <p className="text-[12px] text-[#9B9B9B]">
          Aucune recette mise en avant pour le moment
        </p>
      </section>
    );
  }

  const formattedRating = recipe.rating.toFixed(1);

  return (
    <section className="relative mt-8 px-5 flex flex-col items-center">
      {/* Round Dish Photo with drop shadow */}
      <div className="relative w-[230px] h-[230px] rounded-full overflow-hidden shrink-0 shadow-[0_20px_40px_rgba(0,0,0,0.18)] z-10 bg-[#F1F2F2]">
        {recipe.imageUrl ? (
          <Image
            src={recipe.imageUrl}
            alt={recipe.title}
            width={230}
            height={230}
            className="w-full h-full object-cover rounded-full"
            priority
          />
        ) : (
          <div className="w-full h-full rounded-full bg-[#F1F2F2]" />
        )}
      </div>

      {/* Floating Overlapping Card */}
      <div className="relative z-20 -mt-[50px] w-[210px] bg-[#F4F6F5]/85 backdrop-blur-md rounded-[20px] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)] border border-white/40 flex flex-col gap-2">
        {/* Row 1: Title and Green Arrow Button */}
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-normal text-[#1C1C1C] truncate flex-1">
            {recipe.title}
          </h2>
          <Link
            href={`/recipe/${recipe.slug}`}
            className="w-[34px] h-[22px] rounded-lg bg-[#5DB534] hover:bg-[#4FA12A] flex items-center justify-center text-white transition-all active:scale-95 shrink-0"
            aria-label={`Voir la recette ${recipe.title}`}
          >
            <ArrowRight className="w-3.5 h-3.5 text-white" strokeWidth={2} />
          </Link>
        </div>

        {/* Row 2: Ingredient count & Rating */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[#9B9B9B] font-normal">
            {recipe.ingredientCount} Ingredients
          </span>
          <div className="flex items-center gap-1">
            <Star
              className="w-3.5 h-3.5 text-[#F5A623] fill-[#F5A623]"
              strokeWidth={1}
            />
            <span className="font-normal text-[#1C1C1C]">{formattedRating}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

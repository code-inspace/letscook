import React from "react";
import Image from "next/image";
import { BackButton } from "./BackButton";
import { FavoriteButton } from "./FavoriteButton";

interface RecipeHeroProps {
  recipeId: string;
  imageUrl: string;
  title: string;
  isFavorite: boolean;
}

export function RecipeHero({
  recipeId,
  imageUrl,
  title,
  isFavorite,
}: RecipeHeroProps) {
  return (
    <section className="px-5 pt-6 flex flex-col">
      {/* Top bar: Back Chevron & Favorite Button */}
      <div className="flex items-center justify-between w-full">
        <BackButton />
        <FavoriteButton recipeId={recipeId} initialIsFavorite={isFavorite} />
      </div>

      {/* 250px Round Dish Photo centered with drop shadow */}
      <div className="mt-4 flex justify-center items-center w-full">
        <div className="relative w-[250px] h-[250px] rounded-full overflow-hidden shrink-0 shadow-[0_20px_40px_rgba(0,0,0,0.18)] bg-[#F1F2F2]">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              width={250}
              height={250}
              className="w-full h-full object-cover rounded-full"
              priority
            />
          ) : (
            <div className="w-full h-full rounded-full bg-[#F1F2F2]" />
          )}
        </div>
      </div>
    </section>
  );
}

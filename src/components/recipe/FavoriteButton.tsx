"use client";

import React, { useOptimistic, useTransition } from "react";
import { Heart } from "lucide-react";
import { toggleFavorite } from "@/app/actions";

interface FavoriteButtonProps {
  recipeId: string;
  initialIsFavorite: boolean;
}

export function FavoriteButton({
  recipeId,
  initialIsFavorite,
}: FavoriteButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticFavorite, setOptimisticFavorite] = useOptimistic(
    initialIsFavorite,
    (state, newState: boolean) => newState
  );

  const handleToggle = async () => {
    startTransition(async () => {
      setOptimisticFavorite(!optimisticFavorite);
      try {
        await toggleFavorite(recipeId);
      } catch (error) {
        console.error("Failed to toggle favorite:", error);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={optimisticFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
      className="w-10 h-10 rounded-xl bg-[#F1F2F2] hover:bg-[#EAEBEB] flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
    >
      <Heart
        className={`w-5 h-5 transition-colors ${
          optimisticFavorite
            ? "text-[#F2546E] fill-[#F2546E]"
            : "text-[#9B9B9B]"
        }`}
        strokeWidth={1.5}
      />
    </button>
  );
}

import React from "react";
import Image from "next/image";
import { RecipeIngredientItem } from "@/types";

interface IngredientRowProps {
  ingredient: RecipeIngredientItem;
}

export function IngredientRow({ ingredient }: IngredientRowProps) {
  return (
    <div className="w-full h-[60px] px-4 rounded-2xl bg-[#F4F6F5] flex items-center justify-between">
      {/* Left: Image (28px) + Name (12px) */}
      <div className="flex items-center gap-3">
        <div className="relative w-7 h-7 rounded-full overflow-hidden shrink-0 bg-white/60 flex items-center justify-center">
          {ingredient.imageUrl ? (
            <Image
              src={ingredient.imageUrl}
              alt={ingredient.name}
              width={28}
              height={28}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full rounded-full bg-slate-200" />
          )}
        </div>
        <span className="text-[12px] font-normal text-[#1C1C1C]">
          {ingredient.name}
        </span>
      </div>

      {/* Right: Quantity in Accent Orange */}
      <span className="text-[11px] font-normal text-[#F0A04B]">
        {ingredient.quantity}
      </span>
    </div>
  );
}

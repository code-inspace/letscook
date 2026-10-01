import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, ArrowRight, Heart } from "lucide-react";
import { getCurrentUser, getUserFavorites } from "@/lib/queries";
import { BottomNav } from "@/components/layout/BottomNav";

export default async function FavoritesPage() {
  const user = await getCurrentUser();
  const favorites = await getUserFavorites(user.id);

  return (
    <div className="flex flex-col min-h-[100dvh] sm:min-h-[812px] bg-white px-5 pt-7 pb-24 relative overflow-y-auto">
      <div className="flex items-center gap-2">
        <Heart className="w-5 h-5 text-[#F2546E] fill-[#F2546E]" strokeWidth={1} />
        <h1 className="text-[24px] font-normal text-[#1C1C1C]">Favoris</h1>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {favorites.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[12px] text-[#9B9B9B]">
              Vous n'avez aucune recette en favoris pour le moment.
            </p>
          </div>
        ) : (
          favorites.map((recipe) => (
            <Link
              key={recipe.id}
              href={`/recipe/${recipe.slug}`}
              className="p-3 rounded-2xl bg-[#F4F6F5] hover:bg-[#ECEEED] transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 shadow-sm bg-white">
                  {recipe.imageUrl ? (
                    <Image
                      src={recipe.imageUrl}
                      alt={recipe.title}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                </div>

                <div className="flex flex-col">
                  <span className="text-[14px] font-normal text-[#1C1C1C] truncate max-w-[170px]">
                    {recipe.title}
                  </span>
                  <div className="flex items-center gap-2 text-[10px] text-[#9B9B9B] mt-0.5">
                    <span>{recipe.formattedDuration}</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5 text-[#1C1C1C]">
                      <Star className="w-3 h-3 text-[#F5A623] fill-[#F5A623]" />
                      {recipe.rating.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#5DB534] shadow-xs">
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

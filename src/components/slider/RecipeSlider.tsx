"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, ChefHat, Clock, Star } from "lucide-react";
import { Recipe } from "@/features/recipes/types";

export interface RecipeSlide {
  recipe: Recipe;
  /** e.g. "Demain • 🌙 Soir" when the recipe is planned */
  badge?: string;
}

/**
 * Swipeable hero carousel (CSS scroll-snap: native momentum on iOS, no library).
 * Each slide keeps the former "featured recipe" look: round dish + glass card.
 */
export function RecipeSlider({ slides }: { slides: RecipeSlide[] }) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);

  const handleScroll = () => {
    const track = trackRef.current;
    if (!track || !track.firstElementChild) return;
    const slideWidth = (track.firstElementChild as HTMLElement).offsetWidth;
    if (slideWidth > 0) setActive(Math.round(track.scrollLeft / slideWidth));
  };

  const goTo = (index: number) => {
    const track = trackRef.current;
    const slide = track?.children[index] as HTMLElement | undefined;
    if (track && slide) track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: "smooth" });
  };

  if (slides.length === 0) return null;

  return (
    <section className="relative mt-3" aria-roledescription="carrousel" aria-label="Recettes à la une">
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar -mx-5"
      >
        {slides.map(({ recipe, badge }, i) => (
          <div
            key={recipe.id}
            className="w-full shrink-0 snap-center flex flex-col items-center px-5"
            aria-roledescription="diapositive"
            aria-label={`${i + 1} sur ${slides.length}`}
          >
            <Link
              href={`/recipes/${recipe.id}`}
              className="relative w-[210px] h-[210px] rounded-full overflow-hidden shrink-0 shadow-[0_16px_36px_rgba(0,0,0,0.14)] z-10 bg-slate-100 p-1 border border-white"
            >
              {recipe.imageUrl ? (
                <img
                  src={recipe.imageUrl}
                  alt={recipe.title}
                  draggable={false}
                  loading={i === 0 ? "eager" : "lazy"}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <div className="w-full h-full rounded-full flex items-center justify-center text-[#5DB534]">
                  <ChefHat className="w-14 h-14" />
                </div>
              )}
              {badge && (
                <span className="absolute top-4 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 rounded-full bg-white/95 text-[10px] font-extrabold text-amber-700 shadow-sm flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" />
                  {badge}
                </span>
              )}
            </Link>

            <div className="relative z-20 -mt-10 w-full max-w-[280px] bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-slate-100 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-extrabold text-[#181A20] truncate flex-1">{recipe.title}</h2>
                <Link
                  href={`/recipes/${recipe.id}`}
                  className="w-8 h-8 rounded-full bg-[#5DB534] hover:bg-[#4FA12A] flex items-center justify-center text-white transition-all active:scale-95 shrink-0"
                  aria-label={`Voir ${recipe.title}`}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#8E929E]">
                <span className="flex items-center gap-1 font-semibold text-[#181A20]">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  {recipe.prepTimeMinutes} min
                </span>
                <span>{recipe.ingredients?.length || 0} ingr.</span>
                {recipe.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-[#F5A623] fill-[#F5A623]" />
                    <span className="font-bold text-[#181A20]">{Number(recipe.rating).toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.recipe.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Aller à la recette ${i + 1}`}
              aria-current={i === active}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                i === active ? "w-5 bg-[#5DB534]" : "w-1.5 bg-slate-300"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

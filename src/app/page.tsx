"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Utensils,
  Plus,
  Clock,
  Star,
  ArrowRight,
  ChefHat,
  Search,
  BookOpen,
  Calendar as CalendarIcon,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { getStoredUserSession } from "@/features/auth/actions";
import { Recipe } from "@/features/recipes/types";
import { fetchRecipesFromDb, getStoredRecipes } from "@/features/recipes/actions";
import { MealPlan } from "@/features/calendar/types";
import { fetchMealPlansFromDb, getStoredMealPlans } from "@/features/calendar/actions";
import { BottomNav } from "@/components/layout/BottomNav";

const DEFAULT_CATEGORIES = [
  { id: "all", name: "Toutes", slug: "" },
  { id: "main", name: "Plats", slug: "Main Dishes" },
  { id: "soups", name: "Soupes", slug: "Soups & Stews" },
  { id: "appetizers", name: "Entrées", slug: "Appetizers" },
  { id: "pastas", name: "Pâtes", slug: "Pastas" },
  { id: "desserts", name: "Desserts", slug: "Desserts" },
];

function formatMealPlanDateBadge(dateStr: string, mealType: string): string {
  const todayStr = new Date().toISOString().split("T")[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const mealIcon =
    mealType === "lunch" ? "☀️ Midi" : mealType === "dinner" ? "🌙 Soir" : "☕ Matin";

  if (dateStr === todayStr) {
    return `Aujourd'hui • ${mealIcon}`;
  }
  if (dateStr === tomorrowStr) {
    return `Demain • ${mealIcon}`;
  }

  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const formatted = dateObj.toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    return `${formatted} • ${mealIcon}`;
  } catch {
    return `${dateStr} • ${mealIcon}`;
  }
}

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  // Deterministic recipe sorting function (newest first, then stable ID sort)
  const sortRecipesStable = useCallback((list: Recipe[]): Recipe[] => {
    return [...list].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;
      return a.id.localeCompare(b.id);
    });
  }, []);

  // Synchronous immediate cache initialization (0ms initial render)
  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    if (typeof window !== "undefined") {
      const session = getStoredUserSession();
      const initial = getStoredRecipes(session?.id);
      return [...initial].sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;
        return a.id.localeCompare(b.id);
      });
    }
    return [];
  });

  const [mealPlans, setMealPlans] = useState<MealPlan[]>(() => {
    if (typeof window !== "undefined") {
      const session = getStoredUserSession();
      return getStoredMealPlans(session?.id);
    }
    return [];
  });

  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isLoadingRecipes, setIsLoadingRecipes] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const session = getStoredUserSession();
      const initial = getStoredRecipes(session?.id);
      return initial.length === 0;
    }
    return true;
  });

  const isFetchingRef = React.useRef<boolean>(false);
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const loadData = useCallback(async (silent = true) => {
    const currentUserId = user?.id || getStoredUserSession()?.id;
    if (!currentUserId || isFetchingRef.current) return;
    isFetchingRef.current = true;

    // 1. Instant local cache load
    const cachedRecipes = getStoredRecipes(currentUserId);
    const cachedPlans = getStoredMealPlans(currentUserId);
    if (cachedRecipes.length > 0) {
      setRecipes((prev) => {
        const sorted = sortRecipesStable(cachedRecipes);
        if (
          prev.length === sorted.length &&
          prev.every(
            (r, i) =>
              r.id === sorted[i]?.id &&
              r.title === sorted[i]?.title &&
              r.imageUrl === sorted[i]?.imageUrl &&
              r.isFavorite === sorted[i]?.isFavorite &&
              r.updatedAt === sorted[i]?.updatedAt
          )
        ) {
          return prev;
        }
        return sorted;
      });
      setMealPlans(cachedPlans);
      setIsLoadingRecipes(false);
    }

    // 2. Fast background database fetch from Supabase
    try {
      const [dbRecipes, dbPlans] = await Promise.all([
        fetchRecipesFromDb(currentUserId),
        fetchMealPlansFromDb(currentUserId),
      ]);
      setRecipes((prev) => {
        const sorted = sortRecipesStable(dbRecipes);
        if (
          prev.length === sorted.length &&
          prev.every(
            (r, i) =>
              r.id === sorted[i]?.id &&
              r.title === sorted[i]?.title &&
              r.imageUrl === sorted[i]?.imageUrl &&
              r.isFavorite === sorted[i]?.isFavorite &&
              r.updatedAt === sorted[i]?.updatedAt
          )
        ) {
          return prev;
        }
        return sorted;
      });
      setMealPlans(dbPlans);
    } catch (err) {
      console.warn("Erreur chargement données accueil:", err);
    } finally {
      setIsLoadingRecipes(false);
      isFetchingRef.current = false;
    }
  }, [user?.id, sortRecipesStable]);

  useEffect(() => {
    if (user?.id) {
      loadData();
    } else if (!authLoading) {
      setIsLoadingRecipes(false);
    }

    const handleDebouncedUpdate = () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        loadData(true);
      }, 300);
    };

    window.addEventListener("letscook:recipes-updated", handleDebouncedUpdate);
    window.addEventListener("letscook:meal-plans-updated", handleDebouncedUpdate);
    window.addEventListener("letscook:sync-completed", handleDebouncedUpdate);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      window.removeEventListener("letscook:recipes-updated", handleDebouncedUpdate);
      window.removeEventListener("letscook:meal-plans-updated", handleDebouncedUpdate);
      window.removeEventListener("letscook:sync-completed", handleDebouncedUpdate);
    };
  }, [user?.id, authLoading, loadData]);

  // Upcoming meal plans (today and future, sorted chronologically)
  const todayStr = new Date().toISOString().split("T")[0];
  const upcomingPlans = useMemo(() => {
    return mealPlans
      .filter((p) => p.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [mealPlans, todayStr]);

  // Filter recipes by category
  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      return (
        !selectedCategory ||
        (recipe.category &&
          recipe.category.toLowerCase().includes(selectedCategory.toLowerCase()))
      );
    });
  }, [recipes, selectedCategory]);

  const featuredRecipe = filteredRecipes[0] || null;
  const remainingRecipes = filteredRecipes.slice(1);

  return (
    <div className="flex flex-col min-h-[100dvh] sm:min-h-[812px] pt-6 pb-28 bg-white relative">
      {/* Search Bar Redirect Button */}
      <div className="px-5">
        <button
          type="button"
          onClick={() => router.push("/search")}
          className="w-full h-11 pl-4 pr-4 rounded-2xl bg-[#F4F6F5] hover:bg-[#ECEEED] text-xs text-[#8E929E] flex items-center justify-between border border-slate-100/80 shadow-2xs active:scale-[0.99] transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-slate-400" />
            <span>Rechercher une recette, un ingrédient...</span>
          </div>
          <span className="text-[10px] font-bold text-[#5DB534] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50">
            Explorer
          </span>
        </button>
      </div>

      {/* 4. Category Filter Chips */}
      <div className="mt-4 px-5">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {DEFAULT_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.slug;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.slug)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#181A20] text-white shadow-xs"
                    : "bg-[#F4F6F5] text-[#8E929E] hover:text-[#181A20] hover:bg-slate-200/70"
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Content Area: Database Recipes or Empty State */}
      <div className="px-5 mt-5">
        {isLoadingRecipes ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 border-3 border-[#5DB534] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs text-[#8E929E]">
              Chargement de votre carnet de recettes...
            </p>
          </div>
        ) : recipes.length === 0 ? (
          /* Empty State */
          <div className="mt-4 py-12 px-6 bg-slate-50/70 rounded-3xl border border-dashed border-slate-200 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[#5DB534] flex items-center justify-center mb-4 shadow-2xs">
              <ChefHat className="w-8 h-8" />
            </div>

            <h3 className="text-base font-extrabold text-[#181A20]">
              Votre carnet est vide
            </h3>
            <p className="text-xs text-[#8E929E] mt-1 max-w-xs leading-relaxed">
              Prenez en photo vos fiches recettes (HelloFresh, Quitoque ou livres). L'IA extrait automatiquement chaque étape et ingrédient !
            </p>

            <Link
              href="/import"
              className="mt-5 px-6 py-3.5 bg-[#5DB534] hover:bg-[#4FA12A] text-white text-xs font-extrabold rounded-full shadow-md shadow-emerald-600/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Importer mes recettes par photo</span>
            </Link>
          </div>
        ) : filteredRecipes.length === 0 ? (
          /* No filter match */
          <div className="py-12 text-center">
            <p className="text-xs text-[#8E929E]">
              Aucune recette trouvée pour cette catégorie.
            </p>
          </div>
        ) : (
          /* Real Recipes from Database */
          <div className="space-y-6">
            {/* Featured Hero Dish Card */}
            {featuredRecipe && (
              <section className="relative mt-3 flex flex-col items-center">
                {/* Round Cutout Dish Plate */}
                <div className="relative w-[210px] h-[210px] rounded-full overflow-hidden shrink-0 shadow-[0_16px_36px_rgba(0,0,0,0.14)] z-10 bg-slate-100 p-1 border border-white">
                  <img
                    src={featuredRecipe.imageUrl}
                    alt={featuredRecipe.title}
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>

                {/* Overlapping Glass Card */}
                <div className="relative z-20 -mt-10 w-full max-w-[280px] bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-slate-100 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-extrabold text-[#181A20] truncate flex-1">
                      {featuredRecipe.title}
                    </h2>
                    <Link
                      href={`/recipes/${featuredRecipe.id}`}
                      className="w-8 h-8 rounded-full bg-[#5DB534] hover:bg-[#4FA12A] flex items-center justify-center text-white transition-all active:scale-95 shrink-0"
                      aria-label={`Voir ${featuredRecipe.title}`}
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#8E929E]">
                    <span className="flex items-center gap-1 font-semibold text-[#181A20]">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      {featuredRecipe.prepTimeMinutes} min
                    </span>
                    <span>{featuredRecipe.ingredients?.length || 0} ingr.</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-[#F5A623] fill-[#F5A623]" />
                      <span className="font-bold text-[#181A20]">
                        {Number(featuredRecipe.rating || 5).toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* 6. Mes Prochaines Recettes (Upcoming Planned Meals) */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#181A20] flex items-center gap-1.5">
                  <CalendarIcon className="w-4 h-4 text-[#5DB534]" />
                  <span>Mes prochaines recettes</span>
                </h3>
                <Link
                  href="/calendar"
                  className="text-[11px] font-bold text-[#5DB534] hover:underline flex items-center gap-0.5"
                >
                  <span>Voir le planning</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {upcomingPlans.length === 0 ? (
                <div className="p-4 bg-[#F8F9FB] rounded-2xl border border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#5DB534] flex items-center justify-center shrink-0">
                      <CalendarIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#181A20]">
                        Aucun repas planifié
                      </p>
                      <p className="text-[10px] text-[#8E929E]">
                        Planifiez vos recettes pour générer votre liste de courses
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/calendar"
                    className="px-3 py-1.5 bg-[#5DB534] hover:bg-[#4FA12A] text-white text-[10px] font-bold rounded-full shadow-2xs active:scale-95 transition-all shrink-0"
                  >
                    Planifier
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
                  {upcomingPlans.map((plan) => (
                    <Link
                      key={plan.id}
                      href={`/recipes/${plan.recipeId}`}
                      className="min-w-[200px] max-w-[220px] p-3 rounded-2xl bg-white border border-slate-100 shadow-2xs hover:shadow-xs transition-all flex flex-col gap-2 shrink-0 group active:scale-98"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-slate-100 shadow-2xs border border-white">
                          {plan.recipeImageUrl ? (
                            <img
                              src={plan.recipeImageUrl}
                              alt={plan.recipeTitle}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-slate-100" />
                          )}
                        </div>

                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-xs font-bold text-[#181A20] truncate">
                            {plan.recipeTitle}
                          </span>
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/50 mt-1 inline-block truncate">
                            {formatMealPlanDateBadge(plan.date, plan.mealType)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* 7. Toutes mes recettes list */}
            {remainingRecipes.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-[#181A20]">
                  Toutes mes recettes ({recipes.length})
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {remainingRecipes.map((recipe) => (
                    <Link
                      key={recipe.id}
                      href={`/recipes/${recipe.id}`}
                      className="p-3.5 bg-[#F4F6F5]/80 hover:bg-[#ECEEED] rounded-2xl border border-slate-100 transition-all flex items-center justify-between group active:scale-98"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 bg-white shadow-2xs border border-white">
                          <img
                            src={recipe.imageUrl}
                            alt={recipe.title}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-[#181A20] truncate max-w-[180px]">
                            {recipe.title}
                          </span>
                          <div className="flex items-center gap-2 text-[10px] text-[#8E929E] mt-0.5">
                            <span>{recipe.prepTimeMinutes}m</span>
                            <span>•</span>
                            <span>{recipe.ingredients?.length || 0} ingr.</span>
                          </div>
                        </div>
                      </div>

                      <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[#5DB534] shadow-2xs group-hover:translate-x-0.5 transition-transform">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 8. Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

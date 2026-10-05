"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Heart,
  Clock,
  Utensils,
  Calendar as CalendarIcon,
  ShoppingBag,
  Check,
  X,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { Recipe } from "@/features/recipes/types";
import { getStoredRecipes, fetchRecipesFromDb, toggleFavoriteInDb } from "@/features/recipes/actions";
import { addOrUpdateMealPlan } from "@/features/calendar/actions";
import { syncAndFetchShoppingList } from "@/features/groceries/actions";

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const recipeId = params?.id as string;

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [servings, setServings] = useState<number>(2);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"ingredients" | "steps" | "nutrition">("ingredients");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Planning Modal State
  const [isPlanModalOpen, setIsPlanModalOpen] = useState<boolean>(false);
  const [planDate, setPlanDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [planMealType, setPlanMealType] = useState<"lunch" | "dinner" | "breakfast" | "snack">("dinner");
  const [planServings, setPlanServings] = useState<number>(2);
  const [isSubmittingPlan, setIsSubmittingPlan] = useState<boolean>(false);
  const [planSuccessToast, setPlanSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || !recipeId) return;

    const all = getStoredRecipes(user.id);
    const found = all.find((r) => r.id === recipeId);
    if (found) {
      setRecipe(found);
      setServings(found.servingsBase || 2);
      setPlanServings(found.servingsBase || 2);
      setIsFavorite(Boolean(found.isFavorite));
      setIsLoading(false);
    }

    // Fetch from Supabase database to ensure freshness
    fetchRecipesFromDb(user.id).then((dbList) => {
      const dbFound = dbList.find((r) => r.id === recipeId);
      if (dbFound) {
        setRecipe(dbFound);
        setServings(dbFound.servingsBase || 2);
        setPlanServings(dbFound.servingsBase || 2);
        setIsFavorite(Boolean(dbFound.isFavorite));
      }
      setIsLoading(false);
    });
  }, [user?.id, recipeId]);

  if (isLoading && !recipe) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-white">
        <div className="w-8 h-8 border-3 border-[#5DB534] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-bold text-slate-500">Chargement de la recette...</p>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-white">
        <p className="text-sm font-bold text-[#181A20]">Recette introuvable</p>
        <p className="text-xs text-[#8E929E] mt-1">Cette recette n'existe pas ou a été supprimée.</p>
        <Link href="/" className="mt-4 px-4 py-2 bg-slate-100 rounded-full text-xs font-bold text-[#181A20]">
          ← Retour à l'accueil
        </Link>
      </div>
    );
  }

  const scaleFactor = recipe.servingsBase ? servings / recipe.servingsBase : 1;

  const toggleFavorite = async () => {
    if (!user?.id) return;
    const newFav = await toggleFavoriteInDb(recipe.id, user.id);
    setIsFavorite(newFav);
    setRecipe((prev) => (prev ? { ...prev, isFavorite: newFav } : null));
  };

  const handleQuickDateSelect = (daysOffset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    setPlanDate(d.toISOString().split("T")[0]);
  };

  const handleConfirmPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !recipe) return;

    setIsSubmittingPlan(true);
    try {
      await addOrUpdateMealPlan(
        {
          recipeId: recipe.id,
          recipeTitle: recipe.title,
          recipeImageUrl: recipe.imageUrl,
          date: planDate,
          mealType: planMealType,
          servings: planServings,
        },
        user.id
      );

      // Automatically synchronize shopping list with the new planned ingredients
      await syncAndFetchShoppingList(user.id);

      setIsPlanModalOpen(false);
      setPlanSuccessToast("Recette ajoutée à votre calendrier et liste de courses !");
      setTimeout(() => setPlanSuccessToast(null), 4000);
    } catch (err) {
      console.error("handleConfirmPlan error:", err);
    } finally {
      setIsSubmittingPlan(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FB] pb-32">
      {/* Toast Notification */}
      {planSuccessToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md bg-zinc-900 text-white p-4 rounded-2xl shadow-xl border border-zinc-700/80 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#5DB534] flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 text-white" strokeWidth={3} />
            </div>
            <span className="text-xs font-bold leading-tight">
              {planSuccessToast}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => router.push("/groceries")}
              className="text-[11px] font-bold text-emerald-400 hover:underline px-1.5 py-1"
            >
              Courses
            </button>
            <button
              onClick={() => router.push("/calendar")}
              className="text-[11px] font-bold text-slate-300 hover:underline px-1.5 py-1"
            >
              Planning
            </button>
          </div>
        </div>
      )}

      {/* Top Header: Back & Favorite */}
      <header className="px-6 pt-7 pb-2 flex items-center justify-between z-20">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-11 h-11 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-[#181A20] shadow-sm border border-slate-100 active:scale-95 transition-all cursor-pointer"
          title="Retour"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlanModalOpen(true)}
            className="px-3.5 py-2 rounded-full bg-white/90 backdrop-blur-md flex items-center gap-1.5 text-xs font-bold text-[#181A20] shadow-sm border border-slate-100 active:scale-95 transition-all cursor-pointer"
            title="Planifier au calendrier"
          >
            <CalendarIcon className="w-4 h-4 text-[#5DB534]" />
            <span>Planifier</span>
          </button>

          <button
            type="button"
            onClick={toggleFavorite}
            className="w-11 h-11 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-sm border border-slate-100 active:scale-95 transition-all cursor-pointer"
            title="Ajouter aux favoris"
          >
            <Heart
              className={`w-5 h-5 transition-colors ${
                isFavorite ? "fill-[#F43F5E] text-[#F43F5E]" : "text-slate-400"
              }`}
            />
          </button>
        </div>
      </header>

      {/* Hero Circular Dish Plate with Cutout */}
      <div className="relative w-full flex flex-col items-center px-6 mt-1">
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
          <div className="absolute inset-4 rounded-full bg-black/12 blur-2xl translate-y-6 scale-95 pointer-events-none" />
          <div className="relative w-full h-full rounded-full p-2.5 bg-gradient-to-b from-white/95 via-white/70 to-slate-200/50 shadow-[0_20px_40px_rgba(0,0,0,0.12)] border border-white">
            <div className="w-full h-full rounded-full overflow-hidden relative shadow-inner bg-slate-100">
              <img
                src={recipe.imageUrl}
                alt={recipe.title}
                className="w-full h-full object-cover object-center"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recipe Info Title & Category */}
      <div className="px-6 mt-6 flex flex-col items-start">
        <span className="text-xs font-bold text-[#5DB534] uppercase tracking-wider">
          {recipe.category || "Plat Principal"}
        </span>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#181A20] tracking-tight mt-1 leading-snug">
          {recipe.title}
        </h1>

        {recipe.subtitle && (
          <p className="text-xs text-[#8E929E] font-medium mt-1 leading-relaxed">
            {recipe.subtitle}
          </p>
        )}
      </div>

      {/* Stats Grid: Minutes, Steps, Difficulty, Rating */}
      <div className="px-6 mt-5 grid grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-2xs flex flex-col items-center justify-center text-center">
          <span className="text-sm font-extrabold text-[#181A20]">
            {recipe.prepTimeMinutes}m
          </span>
          <span className="text-[10px] font-semibold text-[#8E929E] mt-0.5">Minutes</span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-2xs flex flex-col items-center justify-center text-center">
          <span className="text-sm font-extrabold text-[#181A20]">
            {recipe.steps?.length || 0}
          </span>
          <span className="text-[10px] font-semibold text-[#8E929E] mt-0.5">Étapes</span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-2xs flex flex-col items-center justify-center text-center">
          <span className="text-sm font-extrabold text-[#181A20]">
            {recipe.difficulty || "Easy"}
          </span>
          <span className="text-[10px] font-semibold text-[#8E929E] mt-0.5">Difficulté</span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-2xs flex flex-col items-center justify-center text-center">
          <span className="text-sm font-extrabold text-[#181A20]">
            {recipe.rating ? Number(recipe.rating).toFixed(1) : "5.0"}
          </span>
          <span className="text-[10px] font-semibold text-[#8E929E] mt-0.5">Note</span>
        </div>
      </div>

      {/* Navigation Tabs (Ingredients / Steps / Nutrition) */}
      <div className="px-6 mt-6 flex items-center justify-between border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab("ingredients")}
            className={`text-sm font-bold transition-colors pb-1 relative cursor-pointer ${
              activeTab === "ingredients" ? "text-[#181A20]" : "text-[#8E929E] hover:text-[#181A20]"
            }`}
          >
            Ingrédients ({recipe.ingredients?.length || 0})
            {activeTab === "ingredients" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5DB534] rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("steps")}
            className={`text-sm font-bold transition-colors pb-1 relative cursor-pointer ${
              activeTab === "steps" ? "text-[#181A20]" : "text-[#8E929E] hover:text-[#181A20]"
            }`}
          >
            Étapes ({recipe.steps?.length || 0})
            {activeTab === "steps" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5DB534] rounded-full" />
            )}
          </button>

          {recipe.nutrition && (
            <button
              onClick={() => setActiveTab("nutrition")}
              className={`text-sm font-bold transition-colors pb-1 relative cursor-pointer ${
                activeTab === "nutrition" ? "text-[#181A20]" : "text-[#8E929E] hover:text-[#181A20]"
              }`}
            >
              Nutrition
              {activeTab === "nutrition" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5DB534] rounded-full" />
              )}
            </button>
          )}
        </div>

        {/* Servings Multiplier Selector */}
        {activeTab === "ingredients" && (
          <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-full border border-slate-200/80 shadow-2xs">
            <button
              onClick={() => setServings((s) => Math.max(1, s - 1))}
              className="w-5 h-5 flex items-center justify-center text-xs font-bold text-slate-500 hover:text-slate-900 active:scale-90 cursor-pointer"
            >
              -
            </button>
            <span className="text-xs font-bold text-[#181A20]">{servings} pers</span>
            <button
              onClick={() => setServings((s) => s + 1)}
              className="w-5 h-5 flex items-center justify-center text-xs font-bold text-slate-500 hover:text-slate-900 active:scale-90 cursor-pointer"
            >
              +
            </button>
          </div>
        )}
      </div>

      {/* Tab Content 1: Ingredients List */}
      {activeTab === "ingredients" && (
        <div className="px-6 mt-4 space-y-2.5">
          {recipe.ingredients?.map((ing, idx) => {
            const scaledAmount = ing.amount
              ? Math.round(ing.amount * scaleFactor * 10) / 10
              : null;

            return (
              <div
                key={ing.id || idx}
                className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs flex items-center justify-between hover:shadow-xs transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                    <span className="text-lg">🥕</span>
                  </div>

                  <span className="text-xs sm:text-sm font-bold text-[#181A20]">
                    {ing.name}
                  </span>
                </div>

                <span className="text-xs font-bold text-[#EA580C] bg-[#FFF7ED] px-3 py-1.5 rounded-xl border border-amber-100">
                  {scaledAmount !== null ? `${scaledAmount} ${ing.unit}` : ing.unit || "au goût"}
                </span>
              </div>
            );
          })}

          {recipe.utensils && recipe.utensils.length > 0 && (
            <div className="mt-5 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 mb-2">
                <Utensils className="w-4 h-4" />
                <span>Ustensiles recommandés</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recipe.utensils.map((u, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-medium bg-white px-2.5 py-1 rounded-lg text-emerald-900 border border-emerald-200/60"
                  >
                    {u}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Content 2: Steps Preview */}
      {activeTab === "steps" && (
        <div className="px-6 mt-4 space-y-3.5">
          {recipe.steps?.map((step) => (
            <div
              key={step.stepNumber}
              className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs space-y-3"
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#5DB534] text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {step.stepNumber}
                </span>
                <h4 className="text-xs font-bold text-[#181A20]">{step.title}</h4>
              </div>

              {step.imageUrl && (
                <div className="w-full h-36 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-2xs">
                  <img
                    src={step.imageUrl}
                    alt={step.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <p className="text-xs text-[#6B7280] leading-relaxed">
                {step.description}
              </p>

              {step.chefTip && (
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200/60 text-[11px] font-medium text-amber-900">
                  💡 <strong>Astuce :</strong> {step.chefTip}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab Content 3: Nutrition */}
      {activeTab === "nutrition" && recipe.nutrition && (
        <div className="px-6 mt-4 space-y-3">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs">
            <h4 className="text-xs font-bold text-[#181A20] mb-3">Valeurs nutritionnelles (par portion)</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[#8E929E]">Énergie</span>
                <p className="text-sm font-extrabold text-[#181A20] mt-0.5">{recipe.nutrition.caloriesKcal || 650} kcal</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[#8E929E]">Protéines</span>
                <p className="text-sm font-extrabold text-[#181A20] mt-0.5">{recipe.nutrition.proteines || "26g"}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[#8E929E]">Glucides</span>
                <p className="text-sm font-extrabold text-[#181A20] mt-0.5">{recipe.nutrition.glucides || "80g"}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[#8E929E]">Lipides</span>
                <p className="text-sm font-extrabold text-[#181A20] mt-0.5">{recipe.nutrition.lipides || "30g"}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Actions Bar */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[92%] max-w-[420px] z-40 flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => setIsPlanModalOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 py-4 px-4 bg-white/95 backdrop-blur-md text-[#181A20] border border-slate-200/90 text-xs sm:text-sm font-extrabold rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.06)] active:scale-[0.98] transition-all hover:bg-slate-50 cursor-pointer"
        >
          <CalendarIcon className="w-4 h-4 text-[#5DB534]" />
          <span>Planifier cette recette</span>
        </button>

        <Link
          href={`/recipes/${recipe.id}/cook`}
          className="flex-1 flex items-center justify-center py-4 px-4 bg-gradient-to-r from-[#5DB534] to-[#4FA12A] text-white text-xs sm:text-sm font-extrabold rounded-full shadow-[0_8px_24px_rgba(93,181,52,0.45)] active:scale-[0.98] transition-all hover:brightness-105 tracking-wide cursor-pointer text-center"
        >
          Cuisiner
        </Link>
      </div>

      {/* Planification Modal Sheet */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-5 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#5DB534] flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#181A20]">
                    Planifier cette recette
                  </h3>
                  <p className="text-[11px] text-[#8E929E]">
                    Ajoute au calendrier & à la liste de courses
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmPlan} className="mt-5 space-y-4">
              {/* Date Selection */}
              <div>
                <label className="block text-xs font-bold text-[#181A20] mb-2">
                  Date du repas
                </label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => handleQuickDateSelect(0)}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      planDate === new Date().toISOString().split("T")[0]
                        ? "bg-[#5DB534] text-white border-[#5DB534]"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Aujourd'hui
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDateSelect(1)}
                    className="py-2 px-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all cursor-pointer"
                  >
                    Demain
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDateSelect(2)}
                    className="py-2 px-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all cursor-pointer"
                  >
                    Après-demain
                  </button>
                </div>
                <input
                  type="date"
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                  className="w-full bg-slate-50 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#181A20] border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5DB534]/30"
                  required
                />
              </div>

              {/* Meal Type (Lunch vs Dinner) */}
              <div>
                <label className="block text-xs font-bold text-[#181A20] mb-2">
                  Moment du repas
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPlanMealType("lunch")}
                    className={`py-3 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      planMealType === "lunch"
                        ? "bg-emerald-50 border-[#5DB534] text-[#5DB534] shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>☀️</span>
                    <span>Déjeuner (Midi)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlanMealType("dinner")}
                    className={`py-3 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      planMealType === "dinner"
                        ? "bg-emerald-50 border-[#5DB534] text-[#5DB534] shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>🌙</span>
                    <span>Dîner (Soir)</span>
                  </button>
                </div>
              </div>

              {/* Servings */}
              <div>
                <label className="block text-xs font-bold text-[#181A20] mb-2">
                  Nombre de convives
                </label>
                <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setPlanServings((s) => Math.max(1, s - 1))}
                    className="w-9 h-9 rounded-lg bg-white shadow-xs font-extrabold text-slate-700 hover:bg-slate-100 active:scale-95 flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <span className="text-sm font-extrabold text-[#181A20]">
                    {planServings} personne{planServings > 1 ? "s" : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPlanServings((s) => s + 1)}
                    className="w-9 h-9 rounded-lg bg-white shadow-xs font-extrabold text-slate-700 hover:bg-slate-100 active:scale-95 flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Shopping auto-sync info box */}
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200/60 flex items-center gap-2.5">
                <ShoppingBag className="w-4 h-4 text-[#5DB534] shrink-0" />
                <p className="text-[11px] text-emerald-900 font-medium leading-tight">
                  Les <strong>{recipe.ingredients?.length || 0} ingrédients</strong> seront automatiquement ajoutés à votre liste de courses triés par rayon.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmittingPlan}
                className="w-full py-3.5 bg-[#5DB534] hover:bg-[#4FA12A] disabled:opacity-50 text-white font-extrabold text-xs rounded-2xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isSubmittingPlan ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirmer la planification</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

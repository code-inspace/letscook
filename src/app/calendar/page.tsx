"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Plus,
  Search,
  Calendar as CalendarIcon,
  Clock,
  Trash2,
  ExternalLink,
  ChefHat,
  X,
  Utensils,
  Check,
  Sun,
  Moon,
  Coffee,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { Recipe } from "@/features/recipes/types";
import { fetchRecipesFromDb, getStoredRecipes } from "@/features/recipes/actions";
import { MealPlan, MealType } from "@/features/calendar/types";
import {
  fetchMealPlansFromDb,
  getStoredMealPlans,
  addOrUpdateMealPlan,
  deleteMealPlanFromDb,
} from "@/features/calendar/actions";
import { BottomNav } from "@/components/layout/BottomNav";

const MONTH_NAMES = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

function formatDateKey(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export default function CalendarPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("");
  const [selectedMealType, setSelectedMealType] = useState<MealType>("dinner");
  const [selectedPlanDetails, setSelectedPlanDetails] = useState<MealPlan | null>(null);
  const [recipeSearch, setRecipeSearch] = useState<string>("");

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();
  const todayKey = formatDateKey(currentYear, currentMonth, currentDay);

  const todayRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Months to render: from 2 months ago to 6 months in the future
  const monthsToRender: { year: number; month: number }[] = [];
  for (let offset = -1; offset <= 5; offset++) {
    const d = new Date(currentYear, currentMonth + offset, 1);
    monthsToRender.push({ year: d.getFullYear(), month: d.getMonth() });
  }

  // Load recipes and meal plans from Supabase / local cache
  useEffect(() => {
    if (!user?.id) return;

    // Local cached load
    setMealPlans(getStoredMealPlans(user.id));
    setRecipes(getStoredRecipes(user.id));

    // Supabase fresh fetch
    fetchMealPlansFromDb(user.id).then((plans) => setMealPlans(plans));
    fetchRecipesFromDb(user.id).then((recs) => setRecipes(recs));

    const handleUpdate = () => {
      if (user?.id) {
        setMealPlans(getStoredMealPlans(user.id));
      }
    };
    window.addEventListener("letscook:meal-plans-updated", handleUpdate);
    return () => {
      window.removeEventListener("letscook:meal-plans-updated", handleUpdate);
    };
  }, [user?.id]);

  // Scroll to today on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToToday();
    }, 250);
    return () => clearTimeout(timer);
  }, []);

  const scrollToToday = () => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleDayClick = (dateKey: string) => {
    setSelectedDate(dateKey);
    setSelectedRecipeId(recipes[0]?.id || "");
    setSelectedMealType("dinner");
    setIsModalOpen(true);
  };

  const handleSaveMealPlan = async () => {
    if (!user?.id || !selectedDate || !selectedRecipeId) return;

    const chosenRecipe = recipes.find((r) => r.id === selectedRecipeId);
    if (!chosenRecipe) return;

    const newPlan = await addOrUpdateMealPlan(
      {
        recipeId: chosenRecipe.id,
        recipeTitle: chosenRecipe.title,
        recipeImageUrl: chosenRecipe.imageUrl,
        date: selectedDate,
        mealType: selectedMealType,
        servings: chosenRecipe.servingsBase || 2,
      },
      user.id
    );

    setMealPlans((prev) => [...prev.filter((p) => p.id !== newPlan.id), newPlan]);
    setIsModalOpen(false);
  };

  const handleDeleteMealPlan = async (planId: string) => {
    if (!user?.id) return;
    await deleteMealPlanFromDb(planId, user.id);
    setMealPlans((prev) => prev.filter((p) => p.id !== planId));
    setSelectedPlanDetails(null);
  };

  // Group meal plans by date
  const mealPlansByDate = new Map<string, MealPlan[]>();
  mealPlans.forEach((plan) => {
    const existing = mealPlansByDate.get(plan.date) || [];
    existing.push(plan);
    mealPlansByDate.set(plan.date, existing);
  });

  const filteredRecipes = recipes.filter((r) =>
    r.title.toLowerCase().includes(recipeSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-white flex flex-col pb-28 select-none">
      {/* iOS Top Bar */}
      <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-xl px-4 pt-6 pb-3 flex items-center justify-between border-b border-zinc-800/80">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex items-center gap-1 text-[#FF3B30] font-semibold text-sm hover:opacity-80 transition-opacity cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>{currentYear}</span>
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              setSelectedDate(todayKey);
              setSelectedRecipeId(recipes[0]?.id || "");
              setIsModalOpen(true);
            }}
            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-[#FF3B30] transition-all cursor-pointer active:scale-95"
            title="Planifier un repas"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Weekdays Row (Sticky L M M J V S D) */}
      <div className="sticky top-[58px] z-20 bg-black/95 backdrop-blur-md px-3 py-2 border-b border-zinc-900 grid grid-cols-7 text-center">
        {WEEKDAYS.map((dayLetter, i) => (
          <span
            key={i}
            className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider"
          >
            {dayLetter}
          </span>
        ))}
      </div>

      {/* Scrollable Month Feed (Continuous Vertical Scroll) */}
      <div ref={containerRef} className="flex-1 px-3 pt-4 space-y-8">
        {monthsToRender.map(({ year, month }) => {
          const firstDay = new Date(year, month, 1);
          const daysInMonth = new Date(year, month + 1, 0).getDate();

          // 0 = Sunday in JS, so convert to Monday = 0
          let startDayOffset = firstDay.getDay() - 1;
          if (startDayOffset < 0) startDayOffset = 6;

          const monthName = MONTH_NAMES[month];
          const isCurrentMonthView = year === currentYear && month === currentMonth;

          return (
            <div key={`${year}-${month}`} className="space-y-3">
              {/* Month Header in Apple Red / Bold */}
              <div className="pt-2 px-1">
                <h2
                  className={`text-xl font-extrabold tracking-tight ${
                    isCurrentMonthView ? "text-[#FF3B30]" : "text-white"
                  }`}
                >
                  {monthName} {year !== currentYear ? year : ""}
                </h2>
              </div>

              {/* Month Grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {/* Empty placeholder cells for weekday offset */}
                {Array.from({ length: startDayOffset }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="min-h-[86px] rounded-xl p-1" />
                ))}

                {/* Day Cells */}
                {Array.from({ length: daysInMonth }).map((_, dayIdx) => {
                  const dayNum = dayIdx + 1;
                  const dateKey = formatDateKey(year, month, dayNum);
                  const isToday = dateKey === todayKey;
                  const dayPlans = mealPlansByDate.get(dateKey) || [];

                  return (
                    <div
                      key={dateKey}
                      ref={isToday ? todayRef : null}
                      onClick={() => handleDayClick(dateKey)}
                      className={`min-h-[88px] rounded-xl p-1.5 flex flex-col justify-between transition-all cursor-pointer border ${
                        isToday
                          ? "bg-zinc-900/90 border-[#FF3B30]/40 ring-1 ring-[#FF3B30]/30 shadow-md"
                          : "bg-zinc-950 hover:bg-zinc-900/60 border-zinc-900"
                      }`}
                    >
                      {/* Day Number */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                            isToday
                              ? "bg-[#FF3B30] text-white font-extrabold shadow-sm"
                              : "text-zinc-300"
                          }`}
                        >
                          {dayNum}
                        </span>
                      </div>

                      {/* Meals planned on this day */}
                      <div className="space-y-1 mt-1 flex-1">
                        {dayPlans.map((plan) => {
                          const isLunch = plan.mealType === "lunch";
                          const isDinner = plan.mealType === "dinner";

                          return (
                            <div
                              key={plan.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPlanDetails(plan);
                              }}
                              className={`px-1.5 py-1 rounded-md text-[9px] font-semibold truncate flex items-center gap-1 shadow-xs active:scale-95 transition-transform ${
                                isLunch
                                  ? "bg-amber-950/80 text-amber-200 border border-amber-800/50"
                                  : isDinner
                                  ? "bg-indigo-950/80 text-indigo-200 border border-indigo-800/50"
                                  : "bg-emerald-950/80 text-emerald-200 border border-emerald-800/50"
                              }`}
                              title={plan.recipeTitle}
                            >
                              <span className="shrink-0 text-[10px]">
                                {isLunch ? "☀️" : isDinner ? "🌙" : "☕"}
                              </span>
                              <span className="truncate">{plan.recipeTitle}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick "Aujourd'hui" Floating Pill (Matches iOS Screenshot) */}
      <div className="fixed bottom-24 left-5 z-40">
        <button
          type="button"
          onClick={scrollToToday}
          className="px-4 py-2 bg-zinc-900/90 hover:bg-zinc-800 active:scale-95 text-white font-bold text-xs rounded-full border border-zinc-700/80 shadow-xl backdrop-blur-xl flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <CalendarIcon className="w-3.5 h-3.5 text-[#FF3B30]" />
          <span>Aujourd’hui</span>
        </button>
      </div>

      {/* Plan a Meal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-6 text-white">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Planifier un repas
                </h3>
                <span className="text-xs text-[#FF3B30] font-semibold">
                  {selectedDate}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Meal Type Switcher */}
            <div className="flex gap-2 my-4 bg-zinc-950 p-1 rounded-2xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setSelectedMealType("lunch")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  selectedMealType === "lunch"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Midi</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedMealType("dinner")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  selectedMealType === "dinner"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Soir</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedMealType("breakfast")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  selectedMealType === "breakfast"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>Petit-déj</span>
              </button>
            </div>

            {/* Recipe Selection List */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="relative mb-3">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Rechercher une recette..."
                  value={recipeSearch}
                  onChange={(e) => setRecipeSearch(e.target.value)}
                  className="w-full bg-zinc-950 pl-10 pr-4 py-2.5 rounded-2xl text-xs text-white placeholder-zinc-500 border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#FF3B30]/30"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-60">
                {recipes.length === 0 ? (
                  <div className="py-8 text-center text-zinc-500 text-xs">
                    Aucune recette dans votre carnet.{" "}
                    <button
                      onClick={() => router.push("/import")}
                      className="text-[#5DB534] underline font-bold ml-1"
                    >
                      Importer des photos
                    </button>
                  </div>
                ) : filteredRecipes.length === 0 ? (
                  <div className="py-8 text-center text-zinc-500 text-xs">
                    Aucun résultat pour cette recherche.
                  </div>
                ) : (
                  filteredRecipes.map((recipe) => {
                    const isSelected = selectedRecipeId === recipe.id;
                    return (
                      <div
                        key={recipe.id}
                        onClick={() => setSelectedRecipeId(recipe.id)}
                        className={`p-3 rounded-2xl flex items-center justify-between border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-zinc-800 border-[#FF3B30] ring-1 ring-[#FF3B30]/40 shadow-sm"
                            : "bg-zinc-950 hover:bg-zinc-800/60 border-zinc-800"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-800 shrink-0 border border-zinc-700">
                            {recipe.imageUrl && (
                              <img
                                src={recipe.imageUrl}
                                alt={recipe.title}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-white truncate max-w-[190px]">
                              {recipe.title}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {recipe.prepTimeMinutes}m • {recipe.ingredients?.length || 0} ingr.
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-[#FF3B30] text-white flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Modal Submit */}
            <button
              type="button"
              onClick={handleSaveMealPlan}
              disabled={!selectedRecipeId}
              className="w-full mt-4 py-3.5 bg-[#FF3B30] hover:bg-[#E02E24] disabled:opacity-50 text-white text-xs font-extrabold rounded-full shadow-lg shadow-red-900/30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Ajouter au planning</span>
            </button>
          </div>
        </div>
      )}

      {/* Meal Details Popup */}
      {selectedPlanDetails && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-[32px] p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#FF3B30] uppercase">
                {selectedPlanDetails.date} • {selectedPlanDetails.mealType === "lunch" ? "☀️ Midi" : "🌙 Soir"}
              </span>
              <button
                type="button"
                onClick={() => setSelectedPlanDetails(null)}
                className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              {selectedPlanDetails.recipeImageUrl && (
                <img
                  src={selectedPlanDetails.recipeImageUrl}
                  alt={selectedPlanDetails.recipeTitle}
                  className="w-14 h-14 rounded-2xl object-cover border border-zinc-700"
                />
              )}
              <div>
                <h4 className="text-sm font-extrabold text-white">
                  {selectedPlanDetails.recipeTitle}
                </h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Ingrédients ajoutés automatiquement aux courses
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => router.push(`/recipes/${selectedPlanDetails.recipeId}`)}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#5DB534]" />
                <span>Voir la recette</span>
              </button>

              <button
                type="button"
                onClick={() => handleDeleteMealPlan(selectedPlanDetails.id)}
                className="py-2.5 px-3 bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
                title="Supprimer du planning"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shared Bottom Nav */}
      <BottomNav />
    </div>
  );
}

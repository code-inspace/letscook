"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Sparkles,
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
import { syncAndFetchShoppingList } from "@/features/groceries/actions";
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
  const { user } = useAuth();

  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("");
  const [selectedMealType, setSelectedMealType] = useState<MealType>("dinner");
  const [selectedPlanDetails, setSelectedPlanDetails] = useState<MealPlan | null>(null);
  const [recipeSearch, setRecipeSearch] = useState<string>("");

  // Infinite Month Range state
  const [pastMonthsCount, setPastMonthsCount] = useState<number>(6);
  const [futureMonthsCount, setFutureMonthsCount] = useState<number>(12);

  const today = useMemo(() => new Date(), []);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();
  const todayKey = formatDateKey(currentYear, currentMonth, currentDay);

  const todayRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Generate continuous infinite list of months
  const monthsToRender = useMemo(() => {
    const list: { year: number; month: number }[] = [];
    for (let offset = -pastMonthsCount; offset <= futureMonthsCount; offset++) {
      const d = new Date(currentYear, currentMonth + offset, 1);
      list.push({ year: d.getFullYear(), month: d.getMonth() });
    }
    return list;
  }, [pastMonthsCount, futureMonthsCount, currentYear, currentMonth]);

  // Load recipes and meal plans from Supabase / local cache
  useEffect(() => {
    if (!user?.id) return;

    setMealPlans(getStoredMealPlans(user.id));
    setRecipes(getStoredRecipes(user.id));

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

  // Scroll to today on initial mount
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

    await syncAndFetchShoppingList(user.id);

    setMealPlans((prev) => [...prev.filter((p) => p.id !== newPlan.id), newPlan]);
    setIsModalOpen(false);
  };

  const handleDeleteMealPlan = async (planId: string) => {
    if (!user?.id) return;
    await deleteMealPlanFromDb(planId, user.id);
    await syncAndFetchShoppingList(user.id);
    setMealPlans((prev) => prev.filter((p) => p.id !== planId));
    setSelectedPlanDetails(null);
  };

  // Group meal plans by date
  const mealPlansByDate = useMemo(() => {
    const map = new Map<string, MealPlan[]>();
    mealPlans.forEach((plan) => {
      const existing = map.get(plan.date) || [];
      existing.push(plan);
      map.set(plan.date, existing);
    });
    return map;
  }, [mealPlans]);

  const filteredRecipes = recipes.filter((r) =>
    r.title.toLowerCase().includes(recipeSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#181A20] flex flex-col pb-32 select-none">
      {/* Top Header - White minimalist theme */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md px-5 pt-7 pb-3.5 flex items-center justify-between border-b border-slate-100">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#181A20] shadow-sm border border-slate-100 active:scale-95 transition-all cursor-pointer"
          aria-label="Retour accueil"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h1 className="text-base font-extrabold text-[#181A20] flex items-center justify-center gap-1.5">
            <CalendarIcon className="w-4 h-4 text-[#5DB534]" />
            <span>Planning des repas</span>
          </h1>
          <span className="text-[10px] text-[#8E929E] font-medium">
            Défilement infini
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedDate(todayKey);
            setSelectedRecipeId(recipes[0]?.id || "");
            setIsModalOpen(true);
          }}
          className="w-10 h-10 rounded-full bg-[#5DB534] hover:bg-[#4FA12A] text-white flex items-center justify-center shadow-sm active:scale-95 transition-all cursor-pointer"
          title="Planifier un repas"
        >
          <Plus className="w-5 h-5" />
        </button>
      </header>

      {/* Weekdays Row (Sticky L M M J V S D) */}
      <div className="sticky top-[73px] z-20 bg-white/95 backdrop-blur-md px-4 py-2 border-b border-slate-100 grid grid-cols-7 text-center">
        {WEEKDAYS.map((dayLetter, i) => (
          <span
            key={i}
            className="text-[11px] font-bold text-slate-400 uppercase tracking-wider"
          >
            {dayLetter}
          </span>
        ))}
      </div>

      {/* Scrollable Month Feed (Continuous Infinite Vertical Scroll) */}
      <div ref={containerRef} className="flex-1 px-4 pt-4 space-y-8 max-w-xl w-full mx-auto">
        {/* Load more past months button */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => setPastMonthsCount((prev) => prev + 6)}
            className="px-4 py-1.5 bg-white text-slate-600 border border-slate-200/80 rounded-full text-xs font-bold shadow-2xs hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
          >
            ↑ Charger les mois précédents
          </button>
        </div>

        {monthsToRender.map(({ year, month }) => {
          const firstDay = new Date(year, month, 1);
          const daysInMonth = new Date(year, month + 1, 0).getDate();

          let startDayOffset = firstDay.getDay() - 1;
          if (startDayOffset < 0) startDayOffset = 6;

          const monthName = MONTH_NAMES[month];
          const isCurrentMonthView = year === currentYear && month === currentMonth;

          return (
            <div key={`${year}-${month}`} className="space-y-2.5">
              {/* Month Header */}
              <div className="pt-2 px-1 flex items-center justify-between">
                <h2
                  className={`text-base font-extrabold tracking-tight ${
                    isCurrentMonthView ? "text-[#5DB534]" : "text-[#181A20]"
                  }`}
                >
                  {monthName} {year}
                </h2>
                {isCurrentMonthView && (
                  <span className="text-[10px] font-bold text-[#5DB534] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/50">
                    Ce mois-ci
                  </span>
                )}
              </div>

              {/* Month Grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {/* Empty placeholder cells for weekday offset */}
                {Array.from({ length: startDayOffset }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="min-h-[82px] rounded-2xl p-1" />
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
                      className={`min-h-[84px] rounded-2xl p-1.5 flex flex-col justify-between transition-all cursor-pointer border ${
                        isToday
                          ? "bg-emerald-50/60 border-[#5DB534]/50 ring-2 ring-[#5DB534]/20 shadow-xs"
                          : "bg-white hover:border-slate-300 border-slate-100 shadow-2xs"
                      }`}
                    >
                      {/* Day Number */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                            isToday
                              ? "bg-[#5DB534] text-white font-extrabold shadow-xs"
                              : "text-[#181A20]"
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
                              className={`px-1.5 py-0.5 rounded-lg text-[9px] font-bold truncate flex items-center gap-1 shadow-2xs active:scale-95 transition-transform border ${
                                isLunch
                                  ? "bg-amber-50 text-amber-900 border-amber-200/80"
                                  : isDinner
                                  ? "bg-emerald-50 text-emerald-900 border-emerald-200/80"
                                  : "bg-blue-50 text-blue-900 border-blue-200/80"
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

        {/* Load more future months button */}
        <div className="text-center pb-6">
          <button
            type="button"
            onClick={() => setFutureMonthsCount((prev) => prev + 12)}
            className="px-4 py-1.5 bg-white text-slate-600 border border-slate-200/80 rounded-full text-xs font-bold shadow-2xs hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
          >
            ↓ Charger les mois suivants
          </button>
        </div>
      </div>

      {/* Quick "Aujourd'hui" Floating Pill */}
      <div className="fixed bottom-24 left-5 z-30">
        <button
          type="button"
          onClick={scrollToToday}
          className="px-4 py-2 bg-white hover:bg-slate-50 active:scale-95 text-[#181A20] font-bold text-xs rounded-full border border-slate-200 shadow-md backdrop-blur-md flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <CalendarIcon className="w-3.5 h-3.5 text-[#5DB534]" />
          <span>Aujourd’hui</span>
        </button>
      </div>

      {/* Plan a Meal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white border border-slate-100 rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-6 text-[#181A20]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-[#181A20]">
                  Planifier un repas
                </h3>
                <span className="text-xs text-[#5DB534] font-semibold">
                  {selectedDate}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Meal Type Switcher */}
            <div className="flex gap-2 my-4 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedMealType("lunch")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  selectedMealType === "lunch"
                    ? "bg-white text-amber-700 shadow-xs border border-amber-200/60"
                    : "text-slate-500 hover:text-slate-950"
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Midi</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedMealType("dinner")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  selectedMealType === "dinner"
                    ? "bg-white text-emerald-700 shadow-xs border border-emerald-200/60"
                    : "text-slate-500 hover:text-slate-950"
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-emerald-600" />
                <span>Soir</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedMealType("breakfast")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  selectedMealType === "breakfast"
                    ? "bg-white text-blue-700 shadow-xs border border-blue-200/60"
                    : "text-slate-500 hover:text-slate-950"
                }`}
              >
                <Coffee className="w-3.5 h-3.5 text-blue-500" />
                <span>Petit-déj</span>
              </button>
            </div>

            {/* Recipe Selection List */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="relative mb-3">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher une recette..."
                  value={recipeSearch}
                  onChange={(e) => setRecipeSearch(e.target.value)}
                  className="w-full bg-slate-50 pl-10 pr-4 py-2.5 rounded-2xl text-xs text-[#181A20] placeholder-slate-400 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5DB534]/30"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-60">
                {recipes.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    Aucune recette dans votre carnet.{" "}
                    <button
                      onClick={() => router.push("/import")}
                      className="text-[#5DB534] underline font-bold ml-1"
                    >
                      Importer des photos
                    </button>
                  </div>
                ) : filteredRecipes.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
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
                            ? "bg-emerald-50/60 border-[#5DB534] ring-1 ring-[#5DB534]/30 shadow-xs"
                            : "bg-slate-50 hover:bg-slate-100/80 border-slate-100"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-100">
                            {recipe.imageUrl && (
                              <img
                                src={recipe.imageUrl}
                                alt={recipe.title}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-[#181A20] truncate max-w-[190px]">
                              {recipe.title}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {recipe.prepTimeMinutes}m • {recipe.ingredients?.length || 0} ingr.
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-[#5DB534] text-white flex items-center justify-center shadow-xs">
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
              className="w-full mt-4 py-3.5 bg-[#5DB534] hover:bg-[#4FA12A] disabled:opacity-50 text-white text-xs font-extrabold rounded-full shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Ajouter au planning</span>
            </button>
          </div>
        </div>
      )}

      {/* Meal Details Popup */}
      {selectedPlanDetails && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white border border-slate-100 rounded-[32px] p-6 shadow-2xl space-y-4 animate-in zoom-in-95 text-[#181A20]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#5DB534] uppercase">
                {selectedPlanDetails.date} • {selectedPlanDetails.mealType === "lunch" ? "☀️ Midi" : "🌙 Soir"}
              </span>
              <button
                type="button"
                onClick={() => setSelectedPlanDetails(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:text-slate-900"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              {selectedPlanDetails.recipeImageUrl && (
                <img
                  src={selectedPlanDetails.recipeImageUrl}
                  alt={selectedPlanDetails.recipeTitle}
                  className="w-14 h-14 rounded-2xl object-cover border border-slate-100 shadow-2xs"
                />
              )}
              <div>
                <h4 className="text-sm font-extrabold text-[#181A20]">
                  {selectedPlanDetails.recipeTitle}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Ingrédients ajoutés automatiquement aux courses
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => router.push(`/recipes/${selectedPlanDetails.recipeId}`)}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                <span>Voir la recette</span>
              </button>

              <button
                type="button"
                onClick={() => handleDeleteMealPlan(selectedPlanDetails.id)}
                className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
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

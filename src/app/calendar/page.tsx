"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
  List,
  Grid,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useRecipes } from "@/features/recipes/actions";
import { MealPlan, MealType } from "@/features/calendar/types";
import {
  useMealPlans,
  addOrUpdateMealPlan,
  deleteMealPlanFromDb,
} from "@/features/calendar/actions";
import { syncAndFetchShoppingList } from "@/features/groceries/actions";
import { BottomNav } from "@/components/layout/BottomNav";
import { DEFAULT_SERVINGS } from "@/features/recipes/types";
import { categoryLabel } from "@/features/recipes/types";

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
const DAY_NAMES_SHORT = ["DIM.", "LUN.", "MAR.", "MER.", "JEU.", "VEN.", "SAM."];

function formatDateKey(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function getWeekRangeLabel(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const dayOfWeek = date.getDay();
    const distanceToMonday = (dayOfWeek + 6) % 7;

    const monday = new Date(date);
    monday.setDate(date.getDate() - distanceToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const startDay = monday.getDate();
    const endDay = sunday.getDate();
    const startMonth = MONTH_NAMES[monday.getMonth()].toUpperCase();
    const endMonth = MONTH_NAMES[sunday.getMonth()].toUpperCase();

    if (monday.getMonth() === sunday.getMonth()) {
      return `${startDay} – ${endDay} ${startMonth}`;
    }
    return `${startDay} ${startMonth} – ${endDay} ${endMonth}`;
  } catch {
    return dateStr;
  }
}

export default function CalendarPage() {
  const router = useRouter();
  const { user } = useAuth();

  // View state: 'planning' (Agenda view with only recipe days) | 'grid' (Monthly calendar)
  const [calendarView, setCalendarView] = useState<"planning" | "grid">("planning");

  const storedPlans = useMealPlans(user?.id);
  const storedRecipes = useRecipes(user?.id);
  const mealPlans = useMemo(() => storedPlans || [], [storedPlans]);
  const recipes = useMemo(() => storedRecipes || [], [storedRecipes]);

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("");
  const [selectedMealType, setSelectedMealType] = useState<MealType>("dinner");
  const [selectedServings, setSelectedServings] = useState<number>(DEFAULT_SERVINGS);
  const [selectedPlanDetails, setSelectedPlanDetails] = useState<MealPlan | null>(null);
  const [recipeSearch, setRecipeSearch] = useState<string>("");

  // Infinite Month Range state for Grid View
  const [pastMonthsCount, setPastMonthsCount] = useState<number>(3);
  const [futureMonthsCount, setFutureMonthsCount] = useState<number>(6);

  const today = useMemo(() => new Date(), []);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();
  const todayKey = formatDateKey(currentYear, currentMonth, currentDay);

  const todayRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const recipeMap = useMemo(
    () => new Map(recipes.map((r) => [r.id, r])),
    [recipes]
  );

  // Group meal plans by date for Grid View
  const mealPlansByDate = useMemo(() => {
    const map = new Map<string, MealPlan[]>();
    mealPlans.forEach((plan) => {
      const existing = map.get(plan.date) || [];
      existing.push(plan);
      map.set(plan.date, existing);
    });
    return map;
  }, [mealPlans]);

  // Group meal plans into Schedule / Agenda grouped by week for Planning View
  const scheduleGroups = useMemo(() => {
    // 1. Get all unique dates with at least one meal plan
    const uniqueDates = Array.from(new Set(mealPlans.map((p) => p.date))).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    // 2. Group by week range
    const groupsMap = new Map<
      string,
      {
        dateKey: string;
        dayOfWeekShort: string;
        dayNumber: number;
        monthNameShort: string;
        isToday: boolean;
        plans: MealPlan[];
      }[]
    >();

    uniqueDates.forEach((dateKey) => {
      const [y, m, d] = dateKey.split("-").map(Number);
      const dateObj = new Date(y, m - 1, d);
      const dayOfWeekShort = DAY_NAMES_SHORT[dateObj.getDay()] || "JOU.";
      const monthNameShort = MONTH_NAMES[dateObj.getMonth()].substring(0, 4) + ".";
      const isToday = dateKey === todayKey;
      const plans = mealPlans.filter((p) => p.date === dateKey);

      const weekLabel = getWeekRangeLabel(dateKey);

      const existingDays = groupsMap.get(weekLabel) || [];
      existingDays.push({
        dateKey,
        dayOfWeekShort,
        dayNumber: d,
        monthNameShort,
        isToday,
        plans,
      });
      groupsMap.set(weekLabel, existingDays);
    });

    return Array.from(groupsMap.entries()).map(([weekLabel, days]) => ({
      weekLabel,
      days,
    }));
  }, [mealPlans, todayKey]);

  // Generate continuous infinite list of months for Grid view
  const monthsToRender = useMemo(() => {
    const list: { year: number; month: number }[] = [];
    for (let offset = -pastMonthsCount; offset <= futureMonthsCount; offset++) {
      const d = new Date(currentYear, currentMonth + offset, 1);
      list.push({ year: d.getFullYear(), month: d.getMonth() });
    }
    return list;
  }, [pastMonthsCount, futureMonthsCount, currentYear, currentMonth]);

  const scrollToToday = () => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    } else if (calendarView === "planning") {
      setCalendarView("grid");
      setTimeout(() => {
        if (todayRef.current) {
          todayRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 150);
    }
  };

  // Auto-focus on today date on initial mount and when switching views
  useEffect(() => {
    const timer = setTimeout(() => {
      if (todayRef.current) {
        todayRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [calendarView]);

  const handleDayClick = (dateKey: string) => {
    setSelectedDate(dateKey);
    setSelectedRecipeId(recipes[0]?.id || "");
    setSelectedMealType("dinner");
    setSelectedServings(DEFAULT_SERVINGS);
    setIsModalOpen(true);
  };

  const handleSaveMealPlan = async () => {
    const currentUserId = user?.id;
    if (!currentUserId || !selectedDate || !selectedRecipeId) return;

    const chosenRecipe = recipes.find((r) => r.id === selectedRecipeId);
    if (!chosenRecipe) return;

    // The local store (and therefore the UI) is updated synchronously; network runs in background
    setIsModalOpen(false);
    await addOrUpdateMealPlan(
      {
        recipeId: chosenRecipe.id,
        recipeTitle: chosenRecipe.title,
        recipeImageUrl: chosenRecipe.imageUrl,
        date: selectedDate,
        mealType: selectedMealType,
        servings: selectedServings,
      },
      currentUserId
    );

    syncAndFetchShoppingList(currentUserId, true);
  };

  const handleDeleteMealPlan = async (planId: string) => {
    const currentUserId = user?.id;
    if (!currentUserId) return;
    setSelectedPlanDetails(null);
    await deleteMealPlanFromDb(planId, currentUserId);
    syncAndFetchShoppingList(currentUserId, true);
  };

  const filteredRecipes = recipes.filter((r) =>
    r.title.toLowerCase().includes(recipeSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#181A20] flex flex-col pb-36 select-none">
      {/* Harmonized Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md px-5 pt-7 pb-3.5 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-[#5DB534] flex items-center justify-center border border-emerald-100 shadow-2xs">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-extrabold text-[#181A20] leading-tight">
              Planning des repas
            </h1>
            <span className="text-[10px] text-[#8E929E] font-medium">
              {mealPlans.length} repas planifié{mealPlans.length > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedDate(todayKey);
            setSelectedRecipeId(recipes[0]?.id || "");
            setIsModalOpen(true);
          }}
          className="w-10 h-10 rounded-full bg-[#5DB534] hover:bg-[#4FA12A] text-white flex items-center justify-center shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
          title="Planifier un repas"
        >
          <Plus className="w-5 h-5" />
        </button>
      </header>

      {/* VIEW 1: VUE PLANNING (AGENDA - ONLY PLANNED MEAL DAYS) */}
      {calendarView === "planning" && (
        <div className="flex-1 px-4 pt-4 space-y-6 max-w-xl w-full mx-auto animate-in fade-in duration-200">
          {scheduleGroups.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-3xl p-8 border border-dashed border-slate-200 shadow-xs space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#5DB534] flex items-center justify-center mx-auto">
                <CalendarIcon className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#181A20]">
                  Aucun repas planifié
                </h3>
                <p className="text-xs text-[#8E929E] mt-1 max-w-xs mx-auto leading-relaxed">
                  Ajoutez vos recettes préférées au calendrier pour organiser votre semaine et générer vos courses automatiquement.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(todayKey);
                  setSelectedRecipeId(recipes[0]?.id || "");
                  setIsModalOpen(true);
                }}
                className="px-5 py-2.5 bg-[#5DB534] hover:bg-[#4FA12A] text-white text-xs font-bold rounded-full inline-flex items-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Planifier un repas</span>
              </button>
            </div>
          ) : (
            scheduleGroups.map(({ weekLabel, days }) => (
              <div key={weekLabel} className="space-y-3">
                {/* Week Header (e.g. 7 – 13 DÉCEMBRE) */}
                <div className="pt-2 px-1">
                  <span className="text-[11px] font-extrabold text-slate-400 tracking-wider uppercase">
                    {weekLabel}
                  </span>
                </div>

                {/* List of planned days */}
                <div className="space-y-3">
                  {days.map(({ dateKey, dayOfWeekShort, dayNumber, isToday, plans }) => (
                    <div
                      key={dateKey}
                      ref={isToday ? todayRef : null}
                      className="flex items-start gap-3"
                    >
                      {/* Left Column: Day info */}
                      <div className="w-12 pt-1 text-center shrink-0 flex flex-col items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                          {dayOfWeekShort}
                        </span>
                        <span
                          className={`text-xl font-black leading-none mt-1 ${
                            isToday
                              ? "w-8 h-8 rounded-full bg-[#5DB534] text-white flex items-center justify-center shadow-xs text-sm"
                              : "text-[#181A20]"
                          }`}
                        >
                          {dayNumber}
                        </span>
                      </div>

                      {/* Right Column: Meal Cards */}
                      <div className="flex-1 space-y-2 min-w-0">
                        {plans.map((plan) => {
                          const planRecipe = recipeMap.get(plan.recipeId);
                          const imageUrl = plan.recipeImageUrl || planRecipe?.imageUrl;
                          const isLunch = plan.mealType === "lunch";
                          const isDinner = plan.mealType === "dinner";

                          return (
                            <div
                              key={plan.id}
                              onClick={() =>
                                setSelectedPlanDetails({
                                  ...plan,
                                  recipeImageUrl: imageUrl,
                                })
                              }
                              className="group relative rounded-3xl overflow-hidden bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.99] flex flex-col sm:flex-row"
                            >
                              {/* Recipe Banner Photo */}
                              <div className="relative h-28 sm:h-auto sm:w-36 bg-slate-100 shrink-0 overflow-hidden">
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    alt={plan.recipeTitle}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-bold text-sm">
                                    <ChefHat className="w-8 h-8 opacity-80" />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent sm:hidden" />

                                {/* Meal Type Badge */}
                                <div className="absolute top-2.5 left-2.5">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 backdrop-blur-md shadow-xs ${
                                      isLunch
                                        ? "bg-amber-500/90 text-white"
                                        : isDinner
                                        ? "bg-emerald-600/90 text-white"
                                        : "bg-blue-600/90 text-white"
                                    }`}
                                  >
                                    {isLunch ? (
                                      <Sun className="w-2.5 h-2.5" />
                                    ) : isDinner ? (
                                      <Moon className="w-2.5 h-2.5" />
                                    ) : (
                                      <Coffee className="w-2.5 h-2.5" />
                                    )}
                                    <span>
                                      {isLunch ? "Midi" : isDinner ? "Soir" : "Matin"}
                                    </span>
                                  </span>
                                </div>
                              </div>

                              {/* Recipe Details */}
                              <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
                                <div>
                                  <h4 className="text-sm font-extrabold text-[#181A20] line-clamp-1 group-hover:text-[#5DB534] transition-colors">
                                    {plan.recipeTitle}
                                  </h4>
                                  {planRecipe?.subtitle && (
                                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                      {planRecipe.subtitle}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-3 mt-3 text-[11px] font-semibold text-slate-400">
                                  {planRecipe?.prepTimeMinutes && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5 text-[#5DB534]" />
                                      {planRecipe.prepTimeMinutes} min
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1">
                                    <Utensils className="w-3.5 h-3.5 text-[#5DB534]" />
                                    {plan.servings || DEFAULT_SERVINGS} portion{(plan.servings || DEFAULT_SERVINGS) > 1 ? "s" : ""}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* VIEW 2: VUE GRILLE MOIS (MONTHLY CONTINUOUS INFINITE SCROLL) */}
      {calendarView === "grid" && (
        <div className="animate-in fade-in duration-200">
          {/* Weekdays Row (Sticky L M M J V S D) */}
          <div className="sticky top-[65px] z-10 bg-white/95 backdrop-blur-md px-4 py-2 border-b border-slate-100 grid grid-cols-7 text-center max-w-xl mx-auto">
            {WEEKDAYS.map((dayLetter, i) => (
              <span
                key={i}
                className="text-[11px] font-bold text-slate-400 uppercase tracking-wider"
              >
                {dayLetter}
              </span>
            ))}
          </div>

          <div ref={containerRef} className="flex-1 px-4 pt-4 space-y-8 max-w-xl w-full mx-auto">
            {/* Load more past months */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setPastMonthsCount((prev) => prev + 3)}
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

                  <div className="grid grid-cols-7 gap-1.5">
                    {Array.from({ length: startDayOffset }).map((_, idx) => (
                      <div key={`empty-${idx}`} className="min-h-[82px] rounded-2xl p-1" />
                    ))}

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
                          className={`min-h-[92px] rounded-2xl p-1.5 flex flex-col justify-between transition-all cursor-pointer border ${
                            isToday
                              ? "bg-emerald-50/60 border-[#5DB534]/50 ring-2 ring-[#5DB534]/20 shadow-xs"
                              : "bg-white hover:border-slate-300 border-slate-100 shadow-2xs"
                          }`}
                        >
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

                          <div className="space-y-1 mt-1 flex-1">
                            {dayPlans.map((plan) => {
                              const isLunch = plan.mealType === "lunch";
                              const isDinner = plan.mealType === "dinner";
                              const planRecipe = recipeMap.get(plan.recipeId);
                              const imageUrl = plan.recipeImageUrl || planRecipe?.imageUrl;

                              return (
                                <div
                                  key={plan.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPlanDetails({
                                      ...plan,
                                      recipeImageUrl: imageUrl,
                                    });
                                  }}
                                  className={`p-1 rounded-xl text-[9px] font-bold flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all border ${
                                    isLunch
                                      ? "bg-amber-50/90 text-amber-950 border-amber-200/80 hover:bg-amber-100"
                                      : isDinner
                                      ? "bg-emerald-50/90 text-emerald-950 border-emerald-200/80 hover:bg-emerald-100"
                                      : "bg-blue-50/90 text-blue-950 border-blue-200/80 hover:bg-blue-100"
                                  }`}
                                  title={`${plan.recipeTitle} (${isLunch ? "Midi" : isDinner ? "Soir" : "Matin"})`}
                                >
                                  <div className="w-5 h-5 rounded-lg overflow-hidden bg-slate-200 shrink-0 border border-white/80 shadow-2xs">
                                    {imageUrl ? (
                                      <img
                                        src={imageUrl}
                                        alt={plan.recipeTitle}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-[8px] bg-slate-100">
                                        {isLunch ? "☀️" : isDinner ? "🌙" : "☕"}
                                      </div>
                                    )}
                                  </div>
                                  <span className="truncate flex-1 leading-tight">
                                    {plan.recipeTitle}
                                  </span>
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

            <div className="text-center pb-6">
              <button
                type="button"
                onClick={() => setFutureMonthsCount((prev) => prev + 6)}
                className="px-4 py-1.5 bg-white text-slate-600 border border-slate-200/80 rounded-full text-xs font-bold shadow-2xs hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
              >
                ↓ Charger les mois suivants
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Floating Action Buttons (FAB): Focus Aujourd'hui + Toggle Vue Planning / Vue Grille */}
      <div className="fixed bottom-24 right-4 z-40 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* Bouton rapide Aujourd'hui */}
        <button
          type="button"
          onClick={scrollToToday}
          className="h-11 px-3.5 bg-white/95 backdrop-blur-md hover:bg-white text-[#181A20] font-extrabold text-xs rounded-2xl border border-slate-200 shadow-lg shadow-black/8 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          title="Centrer sur aujourd'hui"
        >
          <CalendarIcon className="w-4 h-4 text-[#5DB534]" />
          <span>Aujourd’hui</span>
        </button>

        {/* FAB Toggle Vue (Planning vs Grille Mois) */}
        <button
          type="button"
          onClick={() =>
            setCalendarView((prev) => (prev === "planning" ? "grid" : "planning"))
          }
          className="h-11 px-4 bg-[#181A20] hover:bg-[#2C303B] text-white font-extrabold text-xs rounded-2xl shadow-xl shadow-black/15 flex items-center gap-2 active:scale-95 transition-all cursor-pointer border border-slate-800"
          title="Changer de vue"
        >
          {calendarView === "planning" ? (
            <>
              <Grid className="w-4 h-4 text-[#5DB534]" />
              <span>Vue Mois</span>
            </>
          ) : (
            <>
              <List className="w-4 h-4 text-[#5DB534]" />
              <span>Vue Planning</span>
            </>
          )}
        </button>
      </div>

      {/* Plan a Meal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white border border-slate-100 rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-6 text-[#181A20]">
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
                <span>Matin</span>
              </button>
            </div>

            {/* Servings (drives the shopping list quantities) */}
            <div className="flex items-center justify-between mb-4 px-1">
              <span className="text-xs font-bold text-slate-600">Nombre de personnes</span>
              <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setSelectedServings((s) => Math.max(1, s - 1))}
                  className="w-6 h-6 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 font-extrabold text-sm active:scale-95 transition-all cursor-pointer"
                  aria-label="Diminuer les portions"
                >
                  −
                </button>
                <span className="text-xs font-extrabold text-[#181A20] min-w-[48px] text-center">
                  {selectedServings} pers.
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedServings((s) => s + 1)}
                  className="w-6 h-6 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 font-extrabold text-sm active:scale-95 transition-all cursor-pointer"
                  aria-label="Augmenter les portions"
                >
                  +
                </button>
              </div>
            </div>

            {/* Search recipe */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher une recette..."
                value={recipeSearch}
                onChange={(e) => setRecipeSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 text-xs text-[#181A20] placeholder-slate-400 outline-none border border-slate-200/80 focus:bg-white focus:ring-2 focus:ring-[#5DB534]/30"
              />
            </div>

            {/* Recipe Selection List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-2 max-h-56">
              {filteredRecipes.map((r) => {
                const isSelected = selectedRecipeId === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRecipeId(r.id)}
                    className={`p-2.5 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all border ${
                      isSelected
                        ? "bg-emerald-50/80 border-[#5DB534] shadow-xs"
                        : "bg-white hover:bg-slate-50 border-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200/60">
                        {r.imageUrl ? (
                          <img
                            src={r.imageUrl}
                            alt={r.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs">
                            🍳
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-[#181A20] block truncate">
                          {r.title}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {r.prepTimeMinutes} min • {categoryLabel(r.category)}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                        isSelected
                          ? "bg-[#5DB534] border-[#5DB534] text-white"
                          : "border-slate-300"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" strokeWidth={3} />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveMealPlan}
                disabled={!selectedRecipeId}
                className="flex-1 py-3 bg-[#5DB534] hover:bg-[#4FA12A] disabled:opacity-50 text-white font-extrabold text-xs rounded-2xl shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Meal Details Modal */}
      {selectedPlanDetails && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white border border-slate-100 rounded-3xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 text-[#181A20]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedPlanDetails.mealType === "lunch"
                      ? "bg-amber-100 text-amber-800"
                      : selectedPlanDetails.mealType === "dinner"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {selectedPlanDetails.mealType === "lunch"
                    ? "☀️ Midi"
                    : selectedPlanDetails.mealType === "dinner"
                    ? "🌙 Soir"
                    : "☕ Matin"}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {selectedPlanDetails.date}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPlanDetails(null)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Recipe Photo & Title */}
            <div className="space-y-3">
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                {selectedPlanDetails.recipeImageUrl ? (
                  <img
                    src={selectedPlanDetails.recipeImageUrl}
                    alt={selectedPlanDetails.recipeTitle}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                    <ChefHat className="w-10 h-10" />
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-base font-extrabold text-[#181A20] leading-snug">
                  {selectedPlanDetails.recipeTitle}
                </h4>
                <p className="text-xs text-[#8E929E] mt-0.5">
                  Planifié pour {selectedPlanDetails.servings || DEFAULT_SERVINGS} personne{(selectedPlanDetails.servings || DEFAULT_SERVINGS) > 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  router.push(`/recipes/${selectedPlanDetails.recipeId}`)
                }
                className="flex-1 py-3 bg-[#5DB534] hover:bg-[#4FA12A] text-white text-xs font-extrabold rounded-2xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>Voir la recette</span>
              </button>

              <button
                type="button"
                onClick={() => handleDeleteMealPlan(selectedPlanDetails.id)}
                className="w-11 h-11 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="Supprimer du planning"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

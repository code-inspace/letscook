"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChefHat,
  Clock,
  Heart,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Upload,
  Users,
  Utensils,
  Refrigerator,
  Check,
} from "lucide-react";
import { toDateKey } from "@/lib/utils";
import { rankCandidates } from "@/features/calendar/weekPlanner";
import type { ShoppingItem } from "@/features/groceries/types";
import { DEFAULT_SERVINGS, Recipe, categoryLabel } from "@/features/recipes/types";
import type { MealPlan } from "@/features/calendar/types";
import { BottomNav } from "@/components/layout/BottomNav";
import { Skeleton } from "@/components/ui/Skeleton";

const RECENT_COUNT = 6;

const addDays = (date: Date, n: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return "Bonne nuit";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

/** Small round dish photo with a fallback, used across the home sections. */
function Dish({ recipe, className = "" }: { recipe?: Recipe | null; className?: string }) {
  return (
    <div className={`overflow-hidden bg-slate-100 flex items-center justify-center ${className}`}>
      {recipe?.imageUrl ? (
        <img src={recipe.imageUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
      ) : (
        <ChefHat className="w-1/2 h-1/2 text-[#5DB534]/60" />
      )}
    </div>
  );
}

function SectionTitle({ title, href, action }: { title: string; href?: string; action?: string }) {
  return (
    <div className="flex items-center justify-between px-5 mb-3">
      <h2 className="text-[15px] font-extrabold text-[#181A20] tracking-tight">{title}</h2>
      {href && (
        <Link href={href} className="text-xs font-bold text-[#5DB534] flex items-center gap-0.5">
          {action || "Tout voir"}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

export interface HomeViewProps {
  /** null while the local cache is being read */
  storedRecipes: Recipe[] | null;
  storedPlans: MealPlan[] | null;
  shoppingItems: ShoppingItem[] | null;
  userName?: string;
  /** Plans the suggested recipe for tonight */
  onPlanTonight: (recipe: Recipe) => Promise<void>;
}

/** Home screen, presentational: all data comes from props (see app/page.tsx). */
export function HomeView({ storedRecipes, storedPlans, shoppingItems, userName, onPlanTonight }: HomeViewProps) {
  const isLoading = storedRecipes === null || storedPlans === null;
  const recipes = useMemo(
    () =>
      [...(storedRecipes || [])].sort(
        (a, b) => (b.createdAt || "").localeCompare(a.createdAt || "") || a.id.localeCompare(b.id)
      ),
    [storedRecipes]
  );
  const plans = useMemo(() => storedPlans || [], [storedPlans]);
  const byId = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);

  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);

  // Tonight: the meal planned today (if any)
  const todaysPlan: MealPlan | undefined = useMemo(
    () => plans.filter((p) => p.date === todayKey).sort((a, b) => a.id.localeCompare(b.id))[0],
    [plans, todayKey]
  );
  const todaysRecipe = todaysPlan ? byId.get(todaysPlan.recipeId) : undefined;

  // Otherwise: an idea for tonight (favourites / best rated, not eaten recently)
  const ideas = useMemo(() => rankCandidates(recipes, plans, today), [recipes, plans, today]);
  const [ideaIndex, setIdeaIndex] = useState(0);
  const idea = ideas.length ? ideas[ideaIndex % ideas.length] : undefined;
  const [planningIdea, setPlanningIdea] = useState(false);

  const planIdeaTonight = async () => {
    if (!idea) return;
    setPlanningIdea(true);
    try {
      await onPlanTonight(idea);
      navigator.vibrate?.([10, 40, 20]);
    } finally {
      setPlanningIdea(false);
    }
  };

  // The coming 7 days
  const week = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const date = addDays(today, i);
        const key = toDateKey(date);
        const dayPlans = plans.filter((p) => p.date === key);
        return { key, date, plan: dayPlans[0], extra: dayPlans.length - 1 };
      }),
    [plans, today]
  );
  const plannedThisWeek = week.filter((d) => d.plan).length;

  // Shopping progress
  const shopping = useMemo(() => {
    const items = shoppingItems || [];
    const done = items.filter((i) => i.checked).length;
    const recipesInList = new Set(
      items.flatMap((i) => (i.recipeSources || []).map((s) => s.recipeId)).filter(Boolean)
    ).size;
    return { total: items.length, left: items.length - done, done, recipesInList };
  }, [shoppingItems]);

  const favorites = useMemo(() => recipes.filter((r) => r.isFavorite), [recipes]);
  const firstName = (userName || "").split(" ")[0];
  const dateLabel = today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="flex flex-col min-h-[100dvh] sm:min-h-[812px] pb-32 bg-[#F8F9FB] relative">
      {/* 1. Header */}
      <header className="px-5 pt-[max(env(safe-area-inset-top),1.75rem)] pb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[#6B7080] capitalize">{dateLabel}</p>
          <h1 className="text-[22px] leading-tight font-extrabold text-[#181A20] tracking-tight truncate">
            {greeting()}
            {firstName ? `, ${firstName}` : ""} 👋
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/search"
            aria-label="Rechercher une recette"
            className="w-10 h-10 rounded-full bg-white border border-slate-100 shadow-2xs flex items-center justify-center text-[#181A20] active:scale-95 transition-transform"
          >
            <Search className="w-[18px] h-[18px]" />
          </Link>
          <Link
            href="/profile"
            aria-label="Mon profil"
            className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#181A20] to-[#2C303B] text-white text-xs font-extrabold flex items-center justify-center shadow-sm active:scale-95 transition-transform"
          >
            {(firstName || "LC").slice(0, 2).toUpperCase()}
          </Link>
        </div>
      </header>

      {isLoading ? (
        /* Same footprint as the loaded page, so nothing jumps */
        <div className="px-5 space-y-5" aria-busy="true" aria-label="Chargement">
          <Skeleton shape="rounded-2xl" className="w-full h-[260px] !rounded-[28px]" />
          <div className="grid grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} shape="rounded-2xl" className="h-[74px]" />
            ))}
          </div>
          <Skeleton shape="rounded-2xl" className="w-full h-[92px]" />
          <div className="grid grid-cols-2 gap-3">
            {[0, 1].map((i) => (
              <Skeleton key={i} shape="rounded-2xl" className="h-[190px]" />
            ))}
          </div>
        </div>
      ) : recipes.length === 0 ? (
        /* Empty library: onboarding */
        <div className="px-5 space-y-4">
          <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#5DB534] to-[#3E8E1F] p-6 text-white shadow-[0_16px_36px_rgba(93,181,52,0.35)]">
            <ChefHat className="absolute -right-6 -bottom-6 w-40 h-40 text-white/10" />
            <p className="text-xs font-bold uppercase tracking-wider text-white/80">Bienvenue</p>
            <h2 className="mt-1 text-2xl font-extrabold leading-tight">Votre carnet de recettes commence ici</h2>
            <p className="mt-2 text-[13px] text-white/90 leading-relaxed max-w-[260px]">
              Photo d&apos;une fiche, lien, vidéo ou PDF : l&apos;IA extrait ingrédients et étapes pour vous.
            </p>
            <Link
              href="/import"
              className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white text-[#3E8E1F] text-sm font-extrabold shadow-md active:scale-95 transition-transform"
            >
              <Upload className="w-4 h-4" />
              Importer ma première recette
            </Link>
          </div>
          {[
            ["📸", "Fiches HelloFresh, Quitoque, livres", "Prenez la photo, l'IA fait le reste"],
            ["🗓️", "Planifiez la semaine", "La liste de courses se remplit toute seule"],
            ["👩‍🍳", "Cuisinez pas à pas", "Minuteurs, écran allumé, lecture à voix haute"],
          ].map(([icon, title, text]) => (
            <div key={title} className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">{icon}</span>
              <div>
                <p className="text-[13px] font-extrabold text-[#181A20]">{title}</p>
                <p className="text-xs text-[#6B7080]">{text}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-7">
          {/* 2. Tonight */}
          <section className="px-5" aria-label="Ce soir">
            {todaysPlan ? (
              <div className="relative overflow-hidden rounded-[28px] h-[280px] shadow-[0_16px_36px_rgba(0,0,0,0.16)] bg-[#181A20]">
                {todaysRecipe?.imageUrl && (
                  <img src={todaysRecipe.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
                <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/95 text-[11px] font-extrabold text-[#3E8E1F] flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5" />
                  Au menu aujourd&apos;hui
                </div>
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <h2 className="text-2xl font-extrabold leading-tight line-clamp-2">{todaysPlan.recipeTitle}</h2>
                  <div className="mt-1.5 flex items-center gap-3 text-xs font-semibold text-white/85">
                    {todaysRecipe && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {todaysRecipe.prepTimeMinutes} min
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {todaysPlan.servings || DEFAULT_SERVINGS} pers.
                    </span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Link
                      href={`/recipes/${todaysPlan.recipeId}/cook`}
                      className="flex-1 py-3 rounded-2xl bg-[#5DB534] text-white text-sm font-extrabold flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(93,181,52,0.45)] active:scale-95 transition-transform"
                    >
                      <ChefHat className="w-4 h-4" />
                      Cuisiner
                    </Link>
                    <Link
                      href={`/recipes/${todaysPlan.recipeId}`}
                      className="px-5 py-3 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 text-white text-sm font-bold active:scale-95 transition-transform"
                    >
                      Recette
                    </Link>
                  </div>
                </div>
              </div>
            ) : idea ? (
              <div className="rounded-[28px] bg-white border border-slate-100 shadow-[0_8px_24px_rgba(0,0,0,0.06)] p-4">
                <p className="text-xs font-bold text-[#6B7080] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#5DB534]" />
                  Rien de prévu ce soir ? Une idée :
                </p>
                <div className="mt-3 flex items-center gap-4">
                  <Link href={`/recipes/${idea.id}`} className="shrink-0">
                    <Dish recipe={idea} className="w-24 h-24 rounded-full shadow-[0_10px_24px_rgba(0,0,0,0.14)] border-4 border-white" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/recipes/${idea.id}`}>
                      <h2 className="text-lg font-extrabold text-[#181A20] leading-snug line-clamp-2">{idea.title}</h2>
                    </Link>
                    <p className="mt-1 text-xs text-[#6B7080] flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#5DB534]" />
                        {idea.prepTimeMinutes} min
                      </span>
                      <span>·</span>
                      <span>{categoryLabel(idea.category)}</span>
                      {idea.isFavorite && <Heart className="w-3.5 h-3.5 fill-[#F2546E] text-[#F2546E]" />}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={planIdeaTonight}
                    disabled={planningIdea}
                    className="flex-1 py-3 rounded-2xl bg-[#5DB534] hover:bg-[#4FA12A] text-white text-sm font-extrabold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-transform cursor-pointer disabled:opacity-60"
                  >
                    {planningIdea ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
                    Au menu ce soir
                  </button>
                  {ideas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setIdeaIndex((i) => i + 1)}
                      aria-label="Une autre idée"
                      className="w-12 rounded-2xl bg-[#F4F6F5] text-[#181A20] flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </section>

          {/* 3. Shortcuts */}
          <nav className="px-5 grid grid-cols-4 gap-3" aria-label="Raccourcis">
            {[
              { href: "/import", label: "Importer", icon: Upload, tint: "bg-emerald-50 text-[#5DB534]" },
              { href: "/calendar?fill=1", label: "Ma semaine", icon: Sparkles, tint: "bg-amber-50 text-amber-600" },
              { href: "/search?have=1", label: "Mon frigo", icon: Refrigerator, tint: "bg-sky-50 text-sky-600" },
              {
                href: "/groceries",
                label: "Courses",
                icon: ShoppingBag,
                tint: "bg-rose-50 text-rose-500",
                badge: shopping.left || undefined,
              },
            ].map(({ href, label, icon: Icon, tint, badge }) => (
              <Link
                key={href}
                href={href}
                className="relative flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-white border border-slate-100 shadow-2xs active:scale-95 transition-transform"
              >
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${tint}`}>
                  <Icon className="w-5 h-5" />
                </span>
                <span className="text-[11px] font-bold text-[#181A20]">{label}</span>
                {badge !== undefined && (
                  <span className="absolute top-1.5 right-1.5 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          {/* 4. The week */}
          <section aria-label="Ma semaine">
            <SectionTitle
              title={`Ma semaine · ${plannedThisWeek}/7`}
              href={plannedThisWeek < 7 ? "/calendar?fill=1" : "/calendar"}
              action={plannedThisWeek < 7 ? "Compléter" : "Planning"}
            />
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar px-5 pb-1">
              {week.map(({ key, date, plan, extra }) => {
                const isToday = key === todayKey;
                const recipe = plan ? byId.get(plan.recipeId) : undefined;
                return (
                  <Link
                    key={key}
                    href={plan ? `/recipes/${plan.recipeId}` : "/calendar"}
                    className={`shrink-0 w-[76px] rounded-2xl p-2 flex flex-col items-center gap-1.5 border transition-transform active:scale-95 ${
                      isToday ? "bg-[#181A20] border-[#181A20] text-white" : "bg-white border-slate-100 text-[#181A20]"
                    }`}
                  >
                    <span className={`text-[10px] font-bold uppercase ${isToday ? "text-white/70" : "text-[#6B7080]"}`}>
                      {isToday ? "Auj." : date.toLocaleDateString("fr-FR", { weekday: "short" })}
                    </span>
                    <span className="text-base font-extrabold leading-none">{date.getDate()}</span>
                    {plan ? (
                      <div className="relative">
                        <Dish recipe={recipe} className="w-11 h-11 rounded-full border-2 border-white shadow-sm" />
                        {extra > 0 && (
                          <span className="absolute -right-1 -bottom-1 w-5 h-5 rounded-full bg-[#5DB534] text-white text-[10px] font-extrabold flex items-center justify-center">
                            +{extra}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span
                        className={`w-11 h-11 rounded-full border-2 border-dashed flex items-center justify-center ${
                          isToday ? "border-white/30 text-white/60" : "border-slate-200 text-slate-300"
                        }`}
                      >
                        <Plus className="w-4 h-4" />
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>

          {/* 5. Shopping */}
          {shopping.total > 0 && (
            <section className="px-5" aria-label="Courses">
              <Link
                href="/groceries"
                className="block p-4 rounded-[24px] bg-white border border-slate-100 shadow-2xs active:scale-[0.99] transition-transform"
              >
                <div className="flex items-center gap-3">
                  <span className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-5 h-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-[#181A20]">
                      {shopping.left === 0
                        ? "Courses terminées 🎉"
                        : `${shopping.left} article${shopping.left > 1 ? "s" : ""} à acheter`}
                    </p>
                    <p className="text-xs text-[#6B7080]">
                      {shopping.recipesInList > 0
                        ? `Pour ${shopping.recipesInList} recette${shopping.recipesInList > 1 ? "s" : ""} planifiée${shopping.recipesInList > 1 ? "s" : ""}`
                        : "Votre liste de courses"}
                    </p>
                  </div>
                  {shopping.left === 0 ? (
                    <Check className="w-5 h-5 text-[#5DB534]" />
                  ) : (
                    <ArrowRight className="w-5 h-5 text-[#6B7080]" />
                  )}
                </div>
                <div className="mt-3 h-2 rounded-full bg-[#F4F6F5] overflow-hidden" aria-hidden="true">
                  <div
                    className="h-full rounded-full bg-[#5DB534] transition-all"
                    style={{ width: `${Math.round((shopping.done / shopping.total) * 100)}%` }}
                  />
                </div>
              </Link>
            </section>
          )}

          {/* 6. Favourites */}
          {favorites.length > 0 && (
            <section aria-label="Mes favoris">
              <SectionTitle title="Mes favoris" href="/favorites" />
              <div className="flex gap-3 overflow-x-auto no-scrollbar px-5 pb-1 snap-x snap-mandatory">
                {favorites.map((r) => (
                  <Link key={r.id} href={`/recipes/${r.id}`} className="shrink-0 w-[132px] snap-start active:scale-95 transition-transform">
                    <Dish recipe={r} className="w-[132px] h-[132px] rounded-full shadow-[0_10px_24px_rgba(0,0,0,0.12)] border-4 border-white" />
                    <p className="mt-2 text-xs font-bold text-[#181A20] line-clamp-2 text-center px-1">{r.title}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* 7. Library */}
          <section aria-label="Mes recettes">
            <SectionTitle title={`Mes recettes · ${recipes.length}`} href="/search" />
            <div className="px-5 grid grid-cols-2 gap-3">
              {recipes.slice(0, RECENT_COUNT).map((r) => (
                <Link
                  key={r.id}
                  href={`/recipes/${r.id}`}
                  className="rounded-[22px] bg-white border border-slate-100 shadow-2xs overflow-hidden active:scale-[0.98] transition-transform"
                >
                  <div className="relative">
                    <Dish recipe={r} className="w-full aspect-[4/3]" />
                    {r.isFavorite && (
                      <span className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center">
                        <Heart className="w-3.5 h-3.5 fill-[#F2546E] text-[#F2546E]" />
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-[13px] font-extrabold text-[#181A20] leading-snug line-clamp-2 min-h-[2.4em]">{r.title}</p>
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-[#6B7080]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#5DB534]" />
                        {r.prepTimeMinutes} min
                      </span>
                      {r.rating > 0 && (
                        <span className="flex items-center gap-0.5 font-bold text-[#181A20]">
                          <Star className="w-3 h-3 fill-[#F5A623] text-[#F5A623]" />
                          {Number(r.rating).toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {recipes.length > RECENT_COUNT && (
              <div className="px-5 mt-3">
                <Link
                  href="/search"
                  className="w-full py-3 rounded-2xl bg-white border border-slate-200 text-sm font-bold text-[#181A20] flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
                >
                  Voir les {recipes.length} recettes
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </section>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

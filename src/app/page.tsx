"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, Sparkles, Plus, Search, Filter } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { Recipe } from "@/features/recipes/types";
import { fetchRecipesFromDb, getStoredRecipes } from "@/features/recipes/actions";
import { CategoryPills } from "@/components/recipes/CategoryPills";
import { RecipeCard } from "@/components/recipes/RecipeCard";
import { BottomNav } from "@/components/layout/BottomNav";

export default function HomePage() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load recipes on mount and listen for real-time updates
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const data = await fetchRecipesFromDb(user?.id);
      setRecipes(data);
      setIsLoading(false);
    }
    loadData();

    const handleUpdate = () => {
      setRecipes(getStoredRecipes(user?.id));
    };
    window.addEventListener("letscook:recipes-updated", handleUpdate);
    return () => window.removeEventListener("letscook:recipes-updated", handleUpdate);
  }, [user?.id]);

  // Filter recipes by category and search query
  const filteredRecipes = recipes.filter((r) => {
    const matchesCategory =
      selectedCategory === "all" ||
      r.category.toLowerCase().includes(selectedCategory.toLowerCase()) ||
      (selectedCategory === "Soups & Stews" && r.category.includes("Soups")) ||
      (selectedCategory === "Main Dishes" && r.category.includes("Main"));

    const matchesSearch =
      searchQuery === "" ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.ingredients.some((ing) => ing.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col min-h-screen pb-28">
      {/* Top Header: User Profile + Notifications */}
      <header className="px-6 pt-7 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={user?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
              alt={user?.name || "User Avatar"}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-md"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#22C55E] border-2 border-white rounded-full" />
          </div>

          <div className="flex flex-col">
            <span className="text-sm font-bold text-[#181A20] tracking-tight">
              {user?.name || "Juliana Silva"}
            </span>
            <div className="mt-0.5">
              <span className="inline-block px-2.5 py-0.5 bg-white text-[10px] font-semibold text-[#8E929E] rounded-full border border-slate-200/80 shadow-2xs">
                {user?.tier || "Basic"}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="relative w-11 h-11 rounded-full bg-white flex items-center justify-center text-[#181A20] shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5 text-slate-700" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#F43F5E] rounded-full ring-2 ring-white" />
        </button>
      </header>

      {/* Hero Catchphrase */}
      <section className="px-6 pt-3 pb-4">
        <h1 className="text-3xl sm:text-[34px] font-extrabold tracking-tight text-[#181A20] leading-[1.15]">
          Cook <span className="text-[#22C55E]">Special</span>
          <br />
          Every Day
        </h1>
      </section>

      {/* Quick Search & AI Import Banner */}
      <div className="px-6 mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E929E]" />
          <input
            id="recipe-search-input"
            type="text"
            placeholder="Rechercher une recette, ingrédient..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white pl-10 pr-4 py-2.5 rounded-2xl text-xs text-[#181A20] placeholder-[#8E929E] border border-slate-100 focus:outline-none focus:ring-2 focus:ring-[#22C55E]/30 shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        <Link
          href="/import"
          className="flex items-center gap-1.5 px-3.5 py-2.5 bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white text-xs font-bold rounded-2xl shadow-[0_4px_12px_rgba(34,197,94,0.35)] hover:brightness-105 active:scale-95 transition-all shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Scanner</span>
        </Link>
      </div>

      {/* Horizontal Category Filter Pills */}
      <section className="mb-2">
        <CategoryPills
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
      </section>

      {/* Featured Recipe Showcase */}
      <section className="px-6 mt-3 flex flex-col items-center">
        {isLoading ? (
          <div className="w-full py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-10 h-10 border-3 border-[#22C55E] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">Chargement des recettes sécurisées...</span>
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="w-full py-14 px-6 bg-white rounded-3xl border border-slate-100 text-center flex flex-col items-center mt-4 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-[#22C55E] flex items-center justify-center mb-3">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-[#181A20] text-base">Aucune recette trouvée</h3>
            <p className="text-xs text-[#8E929E] mt-1 max-w-[240px]">
              Prenez en photo vos fiches HelloFresh pour ajouter une délicieuse recette en quelques secondes !
            </p>
            <Link
              href="/import"
              className="mt-4 px-5 py-2.5 bg-[#22C55E] text-white text-xs font-bold rounded-full shadow-md hover:bg-[#16A34A] transition-colors"
            >
              Importer par photo IA
            </Link>
          </div>
        ) : (
          <div className="w-full space-y-6">
            {filteredRecipes.map((recipe, index) => (
              <RecipeCard key={recipe.id} recipe={recipe} featured={index === 0} />
            ))}
          </div>
        )}
      </section>

      {/* Floating Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

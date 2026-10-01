import React from "react";
import { getCurrentUser, getCategories, getFeaturedRecipe } from "@/lib/queries";
import { heroConfig } from "@/lib/config";
import { Header } from "@/components/home/Header";
import { HeroTitle } from "@/components/home/HeroTitle";
import { CategoryList } from "@/components/home/CategoryList";
import { FeaturedRecipeCard } from "@/components/home/FeaturedRecipeCard";
import { BottomNav } from "@/components/layout/BottomNav";

interface HomePageProps {
  searchParams: Promise<{ category?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { category: categorySlug } = await searchParams;

  const [user, categories, featuredRecipe] = await Promise.all([
    getCurrentUser(),
    getCategories(),
    getFeaturedRecipe(categorySlug),
  ]);

  return (
    <div className="flex flex-col min-h-[100dvh] sm:min-h-[812px] pb-24 bg-white relative">
      {/* 1. Header with User Profile & Notification Bell */}
      <Header user={user} />

      {/* 2. Hero Catchphrase with Concentric Arcs */}
      <HeroTitle config={heroConfig} />

      {/* 3. Horizontal Categories Filter */}
      <CategoryList
        categories={categories}
        selectedCategorySlug={categorySlug}
      />

      {/* 4. Featured Recipe Round Dish & Overlapping Glass Card */}
      <FeaturedRecipeCard recipe={featuredRecipe} />

      {/* 5. Shared Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

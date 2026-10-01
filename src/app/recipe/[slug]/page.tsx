import React from "react";
import { notFound } from "next/navigation";
import { getCurrentUser, getRecipeBySlug } from "@/lib/queries";
import { RecipeHero } from "@/components/recipe/RecipeHero";
import { StatItem } from "@/components/recipe/StatItem";
import { IngredientRow } from "@/components/recipe/IngredientRow";
import { StartCookingButton } from "@/components/recipe/StartCookingButton";

interface RecipeDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function RecipeDetailPage({
  params,
}: RecipeDetailPageProps) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const recipe = await getRecipeBySlug(slug, user?.id);

  if (!recipe) {
    notFound();
  }

  const hasSteps = recipe.steps.length > 0;
  const formattedRating = recipe.rating.toFixed(1);

  return (
    <div className="flex flex-col min-h-[100dvh] sm:min-h-[812px] bg-white relative pb-28 overflow-y-auto">
      {/* 1 & 2. Top Bar (Back + Favorite) & 250px Round Dish Photo */}
      <RecipeHero
        recipeId={recipe.id}
        imageUrl={recipe.imageUrl}
        title={recipe.title}
        isFavorite={recipe.isFavorite ?? false}
      />

      {/* 3. Recipe Metadata: Category, Title, 4-column Stats */}
      <section className="px-5 mt-7 flex flex-col">
        {recipe.category?.name && (
          <span className="text-[10px] font-normal text-[#5DB534] uppercase tracking-wider">
            {recipe.category.name}
          </span>
        )}
        <h1 className="text-[26px] font-normal text-[#1C1C1C] leading-tight mt-1">
          {recipe.title}
        </h1>

        {/* 4-column Stats Grid without separators or icons */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          <StatItem value={recipe.formattedDuration} label="Minutes" />
          <StatItem value={recipe.stepCount} label="Steps" />
          <StatItem value={recipe.difficultyLabel} label="Difficulty" />
          <StatItem value={formattedRating} label="Rating" />
        </div>
      </section>

      {/* 4 & 5. Ingredients Section & List */}
      <section className="px-5 mt-6 flex flex-col">
        <h2 className="text-[13px] font-medium text-[#1C1C1C]">Ingredients</h2>

        <div className="flex flex-col gap-3 mt-3 pb-8">
          {recipe.ingredients.length === 0 ? (
            <p className="text-[12px] text-[#9B9B9B] py-3">
              Aucun ingrédient renseigné pour cette recette
            </p>
          ) : (
            recipe.ingredients.map((item) => (
              <IngredientRow key={item.ingredientId} ingredient={item} />
            ))
          )}
        </div>
      </section>

      {/* 6. Floating Green CTA Button "Let's Making" over White Gradient */}
      <StartCookingButton recipeSlug={recipe.slug} hasSteps={hasSteps} />
    </div>
  );
}

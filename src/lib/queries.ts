import { prisma } from "./db";
import {
  User,
  Category,
  RecipeDetail,
  FeaturedRecipeSummary,
  StepItem,
  formatDifficulty,
  formatDuration,
} from "@/types";

// Dynamic Fallback Data matching the design specifications
export const FALLBACK_USER: User = {
  id: "user-juliana",
  name: "Juliana Silva",
  avatarUrl:
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  plan: "BASIC",
  hasUnreadNotifications: true,
};

export const FALLBACK_CATEGORIES: Category[] = [
  {
    id: "cat-appetizers",
    name: "Appetizers",
    slug: "appetizers",
    imageUrl:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=100&auto=format&fit=crop&q=80",
    order: 1,
  },
  {
    id: "cat-soups",
    name: "Soups & Stews",
    slug: "soups-stews",
    imageUrl:
      "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=100&auto=format&fit=crop&q=80",
    order: 2,
  },
  {
    id: "cat-desserts",
    name: "Desserts",
    slug: "desserts",
    imageUrl:
      "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=100&auto=format&fit=crop&q=80",
    order: 3,
  },
];

export const FALLBACK_RECIPES: RecipeDetail[] = [
  {
    id: "rec-miso-ramen",
    title: "Miso Ramen",
    slug: "miso-ramen",
    imageUrl:
      "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80",
    durationMinutes: 20,
    difficulty: "EASY",
    rating: 5.0,
    isFeatured: true,
    categoryId: "cat-soups",
    category: {
      id: "cat-soups",
      name: "Soups & Stews",
      slug: "soups-stews",
      imageUrl:
        "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=100&auto=format&fit=crop&q=80",
      order: 2,
    },
    ingredients: [
      {
        ingredientId: "ing-egg",
        name: "Egg",
        imageUrl:
          "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=100&auto=format&fit=crop&q=80",
        quantity: "2x pcs",
        order: 1,
      },
      {
        ingredientId: "ing-chicken",
        name: "Chicken meat",
        imageUrl:
          "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=100&auto=format&fit=crop&q=80",
        quantity: "1/4 kg",
        order: 2,
      },
      {
        ingredientId: "ing-broccoli",
        name: "Broccoli",
        imageUrl:
          "https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=100&auto=format&fit=crop&q=80",
        quantity: "1/4 kg",
        order: 3,
      },
      {
        ingredientId: "ing-noodles",
        name: "Ramen Noodles",
        imageUrl:
          "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=100&auto=format&fit=crop&q=80",
        quantity: "200g",
        order: 4,
      },
      {
        ingredientId: "ing-miso",
        name: "Miso Paste",
        imageUrl:
          "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=100&auto=format&fit=crop&q=80",
        quantity: "2 tbsp",
        order: 5,
      },
    ],
    steps: [
      {
        id: "step-1",
        recipeId: "rec-miso-ramen",
        order: 1,
        title: "Cutting Mushrooms",
        instruction:
          "Slice the mushrooms thinly from top to bottom. Make sure each slice is the same thickness so they cook evenly.",
        imageUrl:
          "https://images.unsplash.com/photo-1547592180-85f173990554?w=800&auto=format&fit=crop&q=80",
        audioUrl: "https://actions.google.com/sounds/v1/food/chop_vegetable.ogg",
        markerX: 72,
        markerY: 69,
      },
      {
        id: "step-2",
        recipeId: "rec-miso-ramen",
        order: 2,
        title: "Boiling Broth",
        instruction:
          "Bring chicken broth to a gentle simmer and whisk in the miso paste until fully dissolved and aromatic.",
        imageUrl:
          "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&auto=format&fit=crop&q=80",
        audioUrl: null,
        markerX: 50,
        markerY: 45,
      },
      {
        id: "step-3",
        recipeId: "rec-miso-ramen",
        order: 3,
        title: "Assembly & Garnish",
        instruction:
          "Place cooked noodles in a bowl, pour hot broth over them, and arrange sliced chicken, mushrooms, and soft boiled egg on top.",
        imageUrl:
          "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&auto=format&fit=crop&q=80",
        audioUrl: null,
        markerX: null,
        markerY: null,
      },
    ],
    ingredientCount: 14,
    stepCount: 10,
    formattedDuration: "20m",
    difficultyLabel: "Easy",
    isFavorite: false,
  },
];

export async function getCurrentUser(): Promise<User> {
  if (process.env.DATABASE_URL) {
    try {
      const user = await prisma.user.findFirst({
        orderBy: { createdAt: "asc" },
      });
      if (user) {
        return {
          id: user.id,
          name: user.name,
          avatarUrl: user.avatarUrl,
          plan: user.plan,
          hasUnreadNotifications: user.hasUnreadNotifications,
        };
      }
    } catch (error) {
      console.warn("DB query failed, fallback user:", error);
    }
  }
  return FALLBACK_USER;
}

export async function getCategories(): Promise<Category[]> {
  if (process.env.DATABASE_URL) {
    try {
      const categories = await prisma.category.findMany({
        orderBy: { order: "asc" },
      });
      if (categories.length > 0) {
        return categories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          imageUrl: c.imageUrl,
          order: c.order,
        }));
      }
    } catch (error) {
      console.warn("DB categories query failed, fallback categories:", error);
    }
  }
  return FALLBACK_CATEGORIES;
}

export async function getFeaturedRecipe(
  categorySlug?: string
): Promise<FeaturedRecipeSummary | null> {
  if (process.env.DATABASE_URL) {
    try {
      let whereClause: any = {};
      if (categorySlug) {
        whereClause = {
          category: {
            slug: categorySlug,
          },
        };
      } else {
        whereClause = {
          isFeatured: true,
        };
      }

      let recipe = await prisma.recipe.findFirst({
        where: whereClause,
        include: {
          _count: {
            select: {
              ingredients: true,
              steps: true,
            },
          },
        },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      });

      if (!recipe && categorySlug) {
        recipe = await prisma.recipe.findFirst({
          where: { category: { slug: categorySlug } },
          include: {
            _count: {
              select: {
                ingredients: true,
                steps: true,
              },
            },
          },
        });
      }

      if (!recipe) {
        recipe = await prisma.recipe.findFirst({
          include: {
            _count: {
              select: {
                ingredients: true,
                steps: true,
              },
            },
          },
        });
      }

      if (recipe) {
        const ingredientCount = recipe._count.ingredients;
        const stepCount = recipe._count.steps;

        return {
          id: recipe.id,
          title: recipe.title,
          slug: recipe.slug,
          imageUrl: recipe.imageUrl,
          durationMinutes: recipe.durationMinutes,
          difficulty: recipe.difficulty,
          rating: recipe.rating,
          isFeatured: recipe.isFeatured,
          categoryId: recipe.categoryId,
          ingredientCount,
          stepCount,
          formattedDuration: formatDuration(recipe.durationMinutes),
          difficultyLabel: formatDifficulty(recipe.difficulty),
        };
      }
    } catch (error) {
      console.warn("DB featured recipe query failed, fallback recipe:", error);
    }
  }

  // Fallback matching
  let matched = FALLBACK_RECIPES[0];
  if (categorySlug) {
    const found = FALLBACK_RECIPES.find((r) => r.category.slug === categorySlug);
    if (found) matched = found;
  }

  if (!matched) return null;

  return {
    id: matched.id,
    title: matched.title,
    slug: matched.slug,
    imageUrl: matched.imageUrl,
    durationMinutes: matched.durationMinutes,
    difficulty: matched.difficulty,
    rating: matched.rating,
    isFeatured: matched.isFeatured,
    categoryId: matched.categoryId,
    ingredientCount: matched.ingredientCount,
    stepCount: matched.stepCount,
    formattedDuration: matched.formattedDuration,
    difficultyLabel: matched.difficultyLabel,
  };
}

export async function isFavorite(
  userId: string,
  recipeId: string
): Promise<boolean> {
  if (!userId || !recipeId) return false;
  if (process.env.DATABASE_URL) {
    try {
      const fav = await prisma.favorite.findUnique({
        where: {
          userId_recipeId: {
            userId,
            recipeId,
          },
        },
      });
      return !!fav;
    } catch (error) {
      return false;
    }
  }
  return false;
}

export async function getRecipeBySlug(
  slug: string,
  userId?: string
): Promise<RecipeDetail | null> {
  if (process.env.DATABASE_URL) {
    try {
      const recipe = await prisma.recipe.findUnique({
        where: { slug },
        include: {
          category: true,
          ingredients: {
            include: {
              ingredient: true,
            },
            orderBy: {
              order: "asc",
            },
          },
          steps: {
            orderBy: {
              order: "asc",
            },
          },
        },
      });

      if (recipe) {
        let favoriteStatus = false;
        if (userId) {
          favoriteStatus = await isFavorite(userId, recipe.id);
        }

        const ingredientCount = recipe.ingredients.length;
        const stepCount = recipe.steps.length;

        return {
          id: recipe.id,
          title: recipe.title,
          slug: recipe.slug,
          imageUrl: recipe.imageUrl,
          durationMinutes: recipe.durationMinutes,
          difficulty: recipe.difficulty,
          rating: recipe.rating,
          isFeatured: recipe.isFeatured,
          categoryId: recipe.categoryId,
          category: {
            id: recipe.category.id,
            name: recipe.category.name,
            slug: recipe.category.slug,
            imageUrl: recipe.category.imageUrl,
            order: recipe.category.order,
          },
          ingredients: recipe.ingredients.map((ri) => ({
            ingredientId: ri.ingredientId,
            name: ri.ingredient.name,
            imageUrl: ri.ingredient.imageUrl,
            quantity: ri.quantity,
            order: ri.order,
          })),
          steps: recipe.steps.map((s) => ({
            id: s.id,
            recipeId: s.recipeId,
            order: s.order,
            title: s.title,
            instruction: s.instruction,
            imageUrl: s.imageUrl,
            audioUrl: s.audioUrl,
            markerX: s.markerX,
            markerY: s.markerY,
          })),
          ingredientCount,
          stepCount,
          formattedDuration: formatDuration(recipe.durationMinutes),
          difficultyLabel: formatDifficulty(recipe.difficulty),
          isFavorite: favoriteStatus,
        };
      }
    } catch (error) {
      console.warn("DB recipe query failed, fallback recipe:", error);
    }
  }

  const found = FALLBACK_RECIPES.find((r) => r.slug === slug);
  return found || null;
}

export interface StepPageData {
  step: StepItem;
  recipeSlug: string;
  recipeTitle: string;
  totalSteps: number;
  allSteps: { order: number; title: string }[];
}

export async function getStep(
  recipeSlug: string,
  order: number
): Promise<StepPageData | null> {
  if (process.env.DATABASE_URL) {
    try {
      const recipe = await prisma.recipe.findUnique({
        where: { slug: recipeSlug },
        include: {
          steps: {
            orderBy: { order: "asc" },
          },
        },
      });

      if (recipe && recipe.steps.length > 0) {
        const currentStep = recipe.steps.find((s) => s.order === order);
        if (currentStep) {
          return {
            step: {
              id: currentStep.id,
              recipeId: currentStep.recipeId,
              order: currentStep.order,
              title: currentStep.title,
              instruction: currentStep.instruction,
              imageUrl: currentStep.imageUrl,
              audioUrl: currentStep.audioUrl,
              markerX: currentStep.markerX,
              markerY: currentStep.markerY,
            },
            recipeSlug: recipe.slug,
            recipeTitle: recipe.title,
            totalSteps: recipe.steps.length,
            allSteps: recipe.steps.map((s) => ({
              order: s.order,
              title: s.title,
            })),
          };
        }
      }
    } catch (error) {
      console.warn("DB step query failed, fallback step:", error);
    }
  }

  const recipe = FALLBACK_RECIPES.find((r) => r.slug === recipeSlug);
  if (!recipe || recipe.steps.length === 0) return null;

  const currentStep = recipe.steps.find((s) => s.order === order);
  if (!currentStep) return null;

  return {
    step: currentStep,
    recipeSlug: recipe.slug,
    recipeTitle: recipe.title,
    totalSteps: recipe.stepCount,
    allSteps: recipe.steps.map((s) => ({
      order: s.order,
      title: s.title,
    })),
  };
}

export async function getUserFavorites(
  userId: string
): Promise<FeaturedRecipeSummary[]> {
  if (process.env.DATABASE_URL) {
    try {
      const favorites = await prisma.favorite.findMany({
        where: { userId },
        include: {
          recipe: {
            include: {
              _count: {
                select: {
                  ingredients: true,
                  steps: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return favorites.map((f) => {
        const r = f.recipe;
        return {
          id: r.id,
          title: r.title,
          slug: r.slug,
          imageUrl: r.imageUrl,
          durationMinutes: r.durationMinutes,
          difficulty: r.difficulty,
          rating: r.rating,
          isFeatured: r.isFeatured,
          categoryId: r.categoryId,
          ingredientCount: r._count.ingredients,
          stepCount: r._count.steps,
          formattedDuration: formatDuration(r.durationMinutes),
          difficultyLabel: formatDifficulty(r.difficulty),
        };
      });
    } catch (error) {
      console.warn("DB favorites query failed, fallback favorites:", error);
    }
  }

  return FALLBACK_RECIPES.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    imageUrl: r.imageUrl,
    durationMinutes: r.durationMinutes,
    difficulty: r.difficulty,
    rating: r.rating,
    isFeatured: r.isFeatured,
    categoryId: r.categoryId,
    ingredientCount: r.ingredientCount,
    stepCount: r.stepCount,
    formattedDuration: r.formattedDuration,
    difficultyLabel: r.difficultyLabel,
  }));
}

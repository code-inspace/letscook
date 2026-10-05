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

export async function getCurrentUser(): Promise<User | null> {
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
      console.warn("DB query getCurrentUser error:", error);
    }
  }
  return null;
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
      console.warn("DB categories query error:", error);
    }
  }
  return [];
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
          ingredientCount: recipe._count.ingredients,
          stepCount: recipe._count.steps,
          formattedDuration: formatDuration(recipe.durationMinutes),
          difficultyLabel: formatDifficulty(recipe.difficulty),
        };
      }
    } catch (error) {
      console.warn("DB featured recipe query error:", error);
    }
  }

  return null;
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
    } catch {
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
          ingredientCount: recipe.ingredients.length,
          stepCount: recipe.steps.length,
          formattedDuration: formatDuration(recipe.durationMinutes),
          difficultyLabel: formatDifficulty(recipe.difficulty),
          isFavorite: favoriteStatus,
        };
      }
    } catch (error) {
      console.warn("DB getRecipeBySlug query error:", error);
    }
  }

  return null;
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
      console.warn("DB getStep query error:", error);
    }
  }

  return null;
}

export async function getUserFavorites(
  userId: string
): Promise<FeaturedRecipeSummary[]> {
  if (!userId) return [];
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
      console.warn("DB getUserFavorites query error:", error);
    }
  }

  return [];
}

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/queries";

export async function toggleFavorite(recipeId: string): Promise<{ isFavorite: boolean }> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return { isFavorite: false };
    }

    const existingFav = await prisma.favorite.findUnique({
      where: {
        userId_recipeId: {
          userId: user.id,
          recipeId,
        },
      },
    });

    if (existingFav) {
      await prisma.favorite.delete({
        where: {
          userId_recipeId: {
            userId: user.id,
            recipeId,
          },
        },
      });
      revalidatePath("/");
      revalidatePath(`/recipe/[slug]`, "layout");
      revalidatePath("/favorites");
      return { isFavorite: false };
    } else {
      await prisma.favorite.create({
        data: {
          userId: user.id,
          recipeId,
        },
      });
      revalidatePath("/");
      revalidatePath(`/recipe/[slug]`, "layout");
      revalidatePath("/favorites");
      return { isFavorite: true };
    }
  } catch (error) {
    console.error("Failed to toggle favorite:", error);
    return { isFavorite: false };
  }
}

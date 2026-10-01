"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/queries";

export async function toggleFavorite(recipeId: string): Promise<{ isFavorite: boolean }> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id || user.id === "guest-user") {
      // If guest user, find or create default user in db
      let dbUser = await prisma.user.findFirst();
      if (!dbUser) {
        dbUser = await prisma.user.create({
          data: {
            name: "Juliana Silva",
            avatarUrl:
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
            plan: "BASIC",
            hasUnreadNotifications: true,
          },
        });
      }

      const existingFav = await prisma.favorite.findUnique({
        where: {
          userId_recipeId: {
            userId: dbUser.id,
            recipeId,
          },
        },
      });

      if (existingFav) {
        await prisma.favorite.delete({
          where: {
            userId_recipeId: {
              userId: dbUser.id,
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
            userId: dbUser.id,
            recipeId,
          },
        });
        revalidatePath("/");
        revalidatePath(`/recipe/[slug]`, "layout");
        revalidatePath("/favorites");
        return { isFavorite: true };
      }
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

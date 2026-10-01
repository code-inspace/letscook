import React from "react";
import { Category } from "@/types";
import { CategoryChip } from "./CategoryChip";

interface CategoryListProps {
  categories: Category[];
  selectedCategorySlug?: string;
}

export function CategoryList({
  categories,
  selectedCategorySlug,
}: CategoryListProps) {
  if (!categories || categories.length === 0) {
    return (
      <section className="px-5 mt-6">
        <p className="text-[12px] text-[#9B9B9B] py-2">
          Aucune catégorie disponible
        </p>
      </section>
    );
  }

  return (
    <section className="mt-6">
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pl-5 pr-5">
        {categories.map((category) => (
          <CategoryChip
            key={category.id}
            category={category}
            isActive={category.slug === selectedCategorySlug}
          />
        ))}
      </div>
    </section>
  );
}

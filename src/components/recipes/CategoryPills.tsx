"use client";

import React from "react";

export interface CategoryItem {
  id: string;
  name: string;
  emoji: string;
}

export const CATEGORIES: CategoryItem[] = [
  { id: "all", name: "All", emoji: "✨" },
  { id: "Appetizers", name: "Appetizers", emoji: "🥗" },
  { id: "Soups & Stews", name: "Soups & Stews", emoji: "🍲" },
  { id: "Main Dishes", name: "Main Dishes", emoji: "🥩" },
  { id: "Pastas", name: "Pastas", emoji: "🍝" },
  { id: "Desserts", name: "Desserts", emoji: "🍰" },
];

interface CategoryPillsProps {
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
}

export const CategoryPills: React.FC<CategoryPillsProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <div className="w-full overflow-x-auto no-scrollbar py-2 px-6 flex items-center gap-3">
      {CATEGORIES.map((cat) => {
        const isSelected = selectedCategory === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl whitespace-nowrap text-xs font-semibold tracking-tight transition-all duration-300 active:scale-95 cursor-pointer shrink-0 ${
              isSelected
                ? "bg-[#EAF7ED] text-[#1E9A4B] border border-[#22C55E]/30 shadow-sm"
                : "bg-white/80 text-[#6B7280] hover:bg-white border border-slate-100 hover:text-[#181A20]"
            }`}
          >
            <span className="text-base leading-none">{cat.emoji}</span>
            <span>{cat.name}</span>
          </button>
        );
      })}
    </div>
  );
};

import React from "react";
import { Search } from "lucide-react";
import { getCategories } from "@/lib/queries";
import { CategoryChip } from "@/components/home/CategoryChip";
import { BottomNav } from "@/components/layout/BottomNav";

export default async function SearchPage() {
  const categories = await getCategories();

  return (
    <div className="flex flex-col min-h-[100dvh] sm:min-h-[812px] bg-white px-5 pt-7 pb-24 relative overflow-y-auto">
      <h1 className="text-[24px] font-normal text-[#1C1C1C]">Recherche</h1>

      {/* Search Input */}
      <div className="mt-4 relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9B9B]" />
        <input
          type="text"
          placeholder="Rechercher une recette ou un ingrédient..."
          className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#F4F6F5] text-[12px] text-[#1C1C1C] placeholder:text-[#9B9B9B] outline-none focus:ring-1 focus:ring-[#5DB534]"
        />
      </div>

      {/* Categories section */}
      <div className="mt-6 flex flex-col">
        <h2 className="text-[13px] font-medium text-[#1C1C1C] mb-3">
          Catégories
        </h2>
        <div className="flex flex-wrap gap-2.5">
          {categories.map((cat) => (
            <CategoryChip key={cat.id} category={cat} isActive={false} />
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

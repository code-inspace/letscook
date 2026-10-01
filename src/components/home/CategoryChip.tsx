import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Category } from "@/types";

interface CategoryChipProps {
  category: Category;
  isActive: boolean;
}

export function CategoryChip({ category, isActive }: CategoryChipProps) {
  const href = isActive ? "/" : `/?category=${category.slug}`;

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2.5 h-[52px] pl-[10px] pr-[18px] py-2 rounded-full bg-[#F4F6F5] transition-all shrink-0 cursor-pointer ${
        isActive
          ? "border border-[#5DB534] shadow-[0_4px_12px_rgba(93,181,52,0.12)]"
          : "border border-transparent hover:bg-[#ECEEED]"
      }`}
    >
      <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 bg-white/70">
        {category.imageUrl ? (
          <Image
            src={category.imageUrl}
            alt={category.name}
            width={32}
            height={32}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full rounded-full bg-slate-200" />
        )}
      </div>
      <span className="text-[12px] font-normal text-[#1C1C1C] whitespace-nowrap">
        {category.name}
      </span>
    </Link>
  );
}

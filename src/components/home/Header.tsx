import React from "react";
import Link from "next/link";
import { Plus, Search, ChefHat } from "lucide-react";
import { UserSession } from "@/features/auth/types";

interface HeaderProps {
  user: UserSession | null;
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md px-5 pt-7 pb-3.5 flex items-center justify-between border-b border-slate-100">
      {/* Brand Title / Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-2xl bg-[#5DB534] text-white flex items-center justify-center shadow-xs">
          <ChefHat className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-base font-extrabold text-[#181A20] leading-tight flex items-center gap-1">
            <span className="text-[#5DB534]">Let's</span>
            <span>Cook</span>
          </h1>
          <span className="text-[10px] text-[#8E929E] font-medium">
            Vos recettes & repas du quotidien
          </span>
        </div>
      </div>

      {/* Right Quick Actions */}
      <div className="flex items-center gap-1.5">
        <Link
          href="/search"
          className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700 active:scale-95 transition-all border border-slate-100"
          title="Rechercher des recettes"
        >
          <Search className="w-4 h-4" />
        </Link>
        <Link
          href="/import"
          className="w-10 h-10 rounded-full bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center text-[#5DB534] active:scale-95 transition-all border border-emerald-100 shadow-xs"
          title="Importer une recette"
        >
          <Plus className="w-4 h-4" />
        </Link>
      </div>
    </header>
  );
}

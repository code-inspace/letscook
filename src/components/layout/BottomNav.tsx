"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Heart, User, Sparkles } from "lucide-react";

export const BottomNav: React.FC = () => {
  const pathname = usePathname();

  // Hide bottom nav in cooking mode
  if (pathname.includes("/cook")) {
    return null;
  }

  const isHome = pathname === "/";
  const isImport = pathname === "/import";
  const isFavorites = pathname === "/favorites";

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-[400px] z-50">
      <nav className="bg-[#181A20]/95 backdrop-blur-xl px-4 py-2.5 rounded-full shadow-2xl border border-white/10 flex items-center justify-between">
        {/* Home Button */}
        <Link
          href="/"
          className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${
            isHome
              ? "bg-[#252830] text-white shadow-inner"
              : "text-[#8E929E] hover:text-white"
          }`}
        >
          <div className={`p-1 rounded-full ${isHome ? "text-[#22C55E]" : ""}`}>
            <Home className="w-5 h-5 fill-current" />
          </div>
          {isHome && <span className="text-sm font-semibold tracking-wide">Home</span>}
        </Link>

        {/* AI Import Center Action */}
        <Link
          href="/import"
          className={`p-2.5 rounded-full transition-all duration-300 relative group ${
            isImport
              ? "bg-[#22C55E] text-white shadow-[0_0_20px_rgba(34,197,94,0.6)]"
              : "text-[#8E929E] hover:text-[#22C55E] bg-white/5 hover:bg-white/10"
          }`}
          title="Importer recette par IA"
        >
          <Sparkles className="w-5 h-5" />
          {!isImport && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#22C55E] rounded-full animate-pulse" />
          )}
        </Link>

        {/* Search */}
        <button
          type="button"
          onClick={() => {
            const searchInput = document.getElementById("recipe-search-input");
            if (searchInput) {
              searchInput.focus();
            } else {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
          className="p-2 rounded-full text-[#8E929E] hover:text-white transition-colors"
          title="Rechercher"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Favorites */}
        <Link
          href="/?filter=favorites"
          className={`p-2 rounded-full transition-colors ${
            isFavorites ? "text-[#EF4444]" : "text-[#8E929E] hover:text-white"
          }`}
          title="Favoris"
        >
          <Heart className="w-5 h-5" />
        </Link>

        {/* Profile */}
        <Link
          href="/#profile"
          className="p-2 rounded-full text-[#8E929E] hover:text-white transition-colors"
          title="Profil"
        >
          <User className="w-5 h-5" />
        </Link>
      </nav>
    </div>
  );
};

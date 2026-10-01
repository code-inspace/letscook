"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Heart, User, Sparkles, LogOut, ShieldCheck, X } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { signOutUser } from "@/features/auth/actions";

export const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const { user } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);

  // Hide bottom nav in cooking mode
  if (pathname.includes("/cook") || pathname.includes("/login")) {
    return null;
  }

  const isHome = pathname === "/";
  const isImport = pathname === "/import";
  const isFavorites = pathname.includes("filter=favorites");

  return (
    <>
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
          <button
            type="button"
            onClick={() => setShowProfileModal(true)}
            className="p-2 rounded-full text-[#8E929E] hover:text-white transition-colors cursor-pointer"
            title="Profil"
          >
            <User className="w-5 h-5" />
          </button>
        </nav>
      </div>

      {/* Profile Dialog Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white rounded-[32px] p-6 w-full max-w-sm shadow-2xl relative border border-slate-100">
            <button
              onClick={() => setShowProfileModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center mt-2">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#16A34A] flex items-center justify-center text-2xl font-extrabold mb-3 shadow-inner ring-4 ring-emerald-50">
                {user?.name ? user.name[0].toUpperCase() : "👨‍🍳"}
              </div>

              <h3 className="text-base font-extrabold text-[#181A20]">
                {user?.name || "Chef Cuisinier"}
              </h3>
              <p className="text-xs text-[#8E929E] mt-0.5">{user?.email}</p>

              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 text-[11px] font-bold rounded-full border border-emerald-200/60">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Compte Chiffré • {user?.tier || "Basic"}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={async () => {
                  setShowProfileModal(false);
                  await signOutUser();
                }}
                className="w-full py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-extrabold rounded-2xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Se déconnecter</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

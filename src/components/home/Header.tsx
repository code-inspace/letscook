import React from "react";
import Link from "next/link";
import { Sparkles, Plus, Search } from "lucide-react";
import { UserSession } from "@/features/auth/types";

interface HeaderProps {
  user: UserSession | null;
}

function getInitials(name?: string, email?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    const beforeAt = email.split("@")[0];
    const parts = beforeAt.split(/[._-]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return beforeAt.substring(0, 2).toUpperCase();
  }
  return "LC";
}

export function Header({ user }: HeaderProps) {
  const name = user?.name || user?.email?.split("@")[0] || "Chef";
  const plan = user?.tier || "Basic";
  const initials = getInitials(user?.name, user?.email);

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md px-5 pt-7 pb-3.5 flex items-center justify-between border-b border-slate-100">
      {/* Left Profile Info with Initials Avatar */}
      <Link
        href="/profile"
        className="flex items-center gap-2.5 active:scale-95 transition-transform"
      >
        <div className="w-10 h-10 rounded-2xl overflow-hidden shrink-0 bg-gradient-to-tr from-[#181A20] to-[#2C303B] text-white flex items-center justify-center font-extrabold text-xs shadow-sm border border-slate-100 tracking-wider">
          {initials}
        </div>

        <div className="flex flex-col items-start">
          <span className="text-xs font-extrabold text-[#181A20] leading-tight">
            {name}
          </span>
          <span className="text-[10px] text-[#5DB534] font-bold">
            {plan === "Basic" ? "Plan Gratuit" : "Plan Pro"}
          </span>
        </div>
      </Link>

      {/* Center Brand/Title */}
      <div className="text-center">
        <h1 className="text-sm font-extrabold text-[#181A20] flex items-center justify-center gap-1">
          <span className="text-[#5DB534]">Let's</span>
          <span>Cook</span>
        </h1>
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

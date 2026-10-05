import React from "react";
import Link from "next/link";
import { Bell, Sparkles } from "lucide-react";
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
    <header className="flex items-center justify-between mt-6 px-5">
      {/* Left Profile Info with Initials Avatar */}
      <Link
        href="/profile"
        className="flex items-center gap-3 active:scale-95 transition-transform"
      >
        <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-gradient-to-tr from-[#181A20] to-[#2C303B] text-white flex items-center justify-center font-extrabold text-xs shadow-sm border border-slate-100 tracking-wider">
          {initials}
        </div>

        <div className="flex flex-col items-start gap-1">
          <span className="text-[13px] font-medium text-[#1C1C1C] leading-none">
            {name}
          </span>
          <span className="inline-block px-2 py-[2px] rounded-full border border-[#1C1C1C] text-[10px] font-normal text-[#1C1C1C] leading-none">
            {plan}
          </span>
        </div>
      </Link>

      {/* Right Actions: AI Import Scanner & Notification Bell */}
      <div className="flex items-center gap-2">
        <Link
          href="/import"
          className="w-10 h-10 rounded-xl bg-[#F1F2F2] hover:bg-[#EAEBEB] flex items-center justify-center text-[#5DB534] shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all active:scale-95 cursor-pointer"
          aria-label="Scanner une fiche recette par IA"
          title="Scanner une recette"
        >
          <Sparkles className="w-[18px] h-[18px]" strokeWidth={1.5} />
        </Link>

        <button
          type="button"
          className="relative w-10 h-10 rounded-xl bg-[#F1F2F2] flex items-center justify-center text-[#1C1C1C] shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:bg-[#EAEBEB] transition-colors cursor-pointer"
          aria-label="Notifications"
        >
          <Bell className="w-[18px] h-[18px] text-[#1C1C1C]" strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
}

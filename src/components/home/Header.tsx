import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Bell, Sparkles } from "lucide-react";
import { User } from "@/types";

interface HeaderProps {
  user: User;
}

export function Header({ user }: HeaderProps) {
  const formattedPlan =
    user.plan.charAt(0).toUpperCase() + user.plan.slice(1).toLowerCase();

  return (
    <header className="flex items-center justify-between mt-6 px-5">
      {/* Left Profile Info */}
      <div className="flex items-center gap-3">
        <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-[#F1F2F2]">
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={user.name}
              width={40}
              height={40}
              className="w-full h-full object-cover rounded-xl"
              priority
            />
          ) : (
            <div className="w-full h-full rounded-xl bg-[#F1F2F2]" />
          )}
        </div>

        <div className="flex flex-col items-start gap-1">
          <span className="text-[13px] font-medium text-[#1C1C1C] leading-none">
            {user.name}
          </span>
          <span className="inline-block px-2 py-[2px] rounded-full border border-[#1C1C1C] text-[10px] font-normal text-[#1C1C1C] leading-none">
            {formattedPlan}
          </span>
        </div>
      </div>

      {/* Right Actions: AI Import Scanner & Notification Bell */}
      <div className="flex items-center gap-2">
        <Link
          href="/import"
          className="w-10 h-10 rounded-xl bg-[#F1F2F2] hover:bg-[#EAEBEB] flex items-center justify-center text-[#5DB534] shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all active:scale-95"
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
          {user.hasUnreadNotifications && (
            <span className="absolute top-[9px] right-[9px] w-1.5 h-1.5 bg-[#F2546E] rounded-full" />
          )}
        </button>
      </div>
    </header>
  );
}

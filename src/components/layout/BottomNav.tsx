"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, Sparkles, ShoppingBag, Heart, User } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Home",
      href: "/",
      icon: Home,
      isActive: pathname === "/",
    },
    {
      label: "Planning",
      href: "/calendar",
      icon: Calendar,
      isActive: pathname.startsWith("/calendar"),
    },
    {
      label: "Scan",
      href: "/import",
      icon: Sparkles,
      isActive: pathname.startsWith("/import"),
    },
    {
      label: "Courses",
      href: "/groceries",
      icon: ShoppingBag,
      isActive: pathname.startsWith("/groceries"),
    },
    {
      label: "Favoris",
      href: "/favorites",
      icon: Heart,
      isActive: pathname.startsWith("/favorites"),
    },
    {
      label: "Profil",
      href: "/profile",
      icon: User,
      isActive: pathname.startsWith("/profile"),
    },
  ];

  return (
    <nav
      className="fixed bottom-4 left-0 right-0 z-40 flex items-center justify-around px-3 pointer-events-none"
      aria-label="Navigation principale"
    >
      <div className="w-full flex items-center justify-between gap-1 pointer-events-auto max-w-[390px] mx-auto bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl px-2.5 py-1.5 rounded-full border border-slate-200/80 dark:border-zinc-800 shadow-[0_12px_32px_rgba(0,0,0,0.14)]">
        {navItems.map((item) => {
          const Icon = item.icon;

          if (item.isActive) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="h-9 px-3 rounded-full bg-[#181A20] text-white flex items-center gap-1.5 shadow-sm transition-all shrink-0"
              >
                <Icon className="w-4 h-4 text-[#5DB534]" strokeWidth={2} />
                <span className="text-[11px] font-bold tracking-tight">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:text-zinc-500 dark:hover:text-white transition-colors rounded-full"
              aria-label={item.label}
              title={item.label}
            >
              <Icon className="w-4 h-4" strokeWidth={1.75} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

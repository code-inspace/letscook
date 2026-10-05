"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, ShoppingBag, Heart, User } from "lucide-react";

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
      className="fixed sm:absolute bottom-0 left-0 right-0 z-40 pointer-events-none flex flex-col justify-end"
      aria-label="Navigation principale"
    >
      {/* Background with top transparent-to-white gradient */}
      <div className="absolute inset-0 -top-8 bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none" />

      <div className="relative z-10 w-full flex items-center justify-around pointer-events-auto max-w-[360px] mx-auto px-4 pb-5 pt-2">
        {navItems.map((item) => {
          const Icon = item.icon;

          if (item.isActive) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="h-10 px-3.5 rounded-full bg-[#1E1E1E] flex items-center gap-1.5 text-white shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all"
              >
                <Icon className="w-4 h-4 text-[#5DB534]" strokeWidth={1.5} />
                <span className="text-[12px] font-normal tracking-tight">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="w-10 h-10 flex items-center justify-center text-[#B5B5B5] hover:text-[#1C1C1C] transition-colors"
              aria-label={item.label}
            >
              <Icon className="w-5 h-5 text-[#B5B5B5]" strokeWidth={1.5} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}


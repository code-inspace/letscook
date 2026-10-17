"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LogOut,
  ShieldCheck,
  ChefHat,
  UploadCloud,
  ArrowRight,
  Sparkles,
  ChevronLeft,
  User,
  Users,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { signOutUser } from "@/features/auth/actions";
import { useRecipes } from "@/features/recipes/actions";
import {
  MAX_REFERENCE_SERVINGS,
  MIN_REFERENCE_SERVINGS,
  setReferenceServings,
  useReferenceServings,
} from "@/features/settings/referenceServings";
import { BottomNav } from "@/components/layout/BottomNav";

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

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const referenceServings = useReferenceServings(user?.id);
  const recipesCount = useRecipes(user?.id)?.length ?? 0;

  const name = user?.name || user?.email?.split("@")[0] || "Chef Cuisinier";
  const email = user?.email || "";
  const plan = user?.tier || "Basic";
  const initials = getInitials(user?.name, user?.email);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50 pb-36">
      {/* Harmonized Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md px-5 pt-7 pb-3.5 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-[#5DB534] flex items-center justify-center border border-emerald-100 shadow-2xs">
            <User className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-extrabold text-[#181A20] leading-tight">
              Mon Profil
            </h1>
            <span className="text-[10px] text-[#8E929E] font-medium">
              Paramètres et compte
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => signOutUser()}
          className="w-10 h-10 rounded-full bg-rose-50 hover:bg-rose-100 flex items-center justify-center text-rose-600 transition-colors cursor-pointer"
          title="Se déconnecter"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      <div className="max-w-xl w-full mx-auto px-5 pt-4 space-y-4">
        {/* User profile card with Initials Avatar */}
        <div className="p-5 rounded-3xl bg-white flex items-center gap-4 border border-slate-100 shadow-xs">
          <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 bg-gradient-to-tr from-[#181A20] to-[#2C303B] text-white flex items-center justify-center font-extrabold text-lg shadow-sm tracking-wider">
            {initials}
          </div>

          <div className="flex flex-col items-start gap-1">
            <span className="text-base font-extrabold text-[#181A20]">{name}</span>
            {email && <span className="text-xs text-[#8E929E]">{email}</span>}
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-[10px] font-bold text-emerald-800 mt-0.5">
              Plan {plan === "Basic" ? "Gratuit" : "Pro"}
            </span>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col items-center justify-center text-center">
            <ChefHat className="w-5 h-5 text-[#5DB534] mb-1" />
            <span className="text-lg font-extrabold text-[#181A20]">{recipesCount}</span>
            <span className="text-[11px] text-[#8E929E]">Recettes sauvegardées</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col items-center justify-center text-center">
            <ShieldCheck className="w-5 h-5 text-emerald-600 mb-1" />
            <span className="text-xs font-bold text-emerald-700">Sauvegarde cloud</span>
            <span className="text-[11px] text-[#8E929E]">Privée & synchronisée</span>
          </div>
        </div>

        {/* Settings */}
        <div className="p-4 bg-white rounded-3xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#5DB534] flex items-center justify-center shrink-0">
                <Users className="w-4.5 h-4.5" />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <span className="text-xs font-extrabold text-[#181A20]">Portions de référence</span>
                <span className="text-[10px] text-[#8E929E]">
                  Proposé en raccourci sur les recettes et le planning
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-full border border-slate-200 shrink-0">
              <button
                type="button"
                disabled={!user || referenceServings <= MIN_REFERENCE_SERVINGS}
                onClick={() => user && setReferenceServings(user.id, referenceServings - 1)}
                aria-label="Une portion de moins"
                className="w-7 h-7 rounded-full bg-white shadow-2xs font-extrabold text-slate-700 disabled:opacity-40 active:scale-95 cursor-pointer"
              >
                −
              </button>
              <span className="min-w-6 text-center text-sm font-extrabold text-[#181A20]" aria-live="polite">
                {referenceServings}
              </span>
              <button
                type="button"
                disabled={!user || referenceServings >= MAX_REFERENCE_SERVINGS}
                onClick={() => user && setReferenceServings(user.id, referenceServings + 1)}
                aria-label="Une portion de plus"
                className="w-7 h-7 rounded-full bg-white shadow-2xs font-extrabold text-slate-700 disabled:opacity-40 active:scale-95 cursor-pointer"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Import Recipes Action Card */}
        <div>
          <Link
            href="/import"
            className="w-full py-4 px-4.5 bg-gradient-to-r from-[#181A20] to-[#2C303B] text-white rounded-3xl flex items-center justify-between shadow-md active:scale-98 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center text-[#5DB534] shrink-0">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                  <span>Importer des recettes</span>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                </span>
                <span className="text-[10px] text-slate-300 mt-0.5">
                  Lien Web direct (Marmiton...) ou Photos OCR
                </span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:translate-x-0.5 transition-transform shrink-0">
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>

        {/* Logout Action */}
        <div>
          <button
            type="button"
            onClick={() => signOutUser()}
            className="w-full py-3.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors cursor-pointer border border-rose-100"
          >
            <LogOut className="w-4 h-4" />
            <span>Se déconnecter de Let's Cook</span>
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

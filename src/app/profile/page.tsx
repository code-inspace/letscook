"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  LogOut,
  ShieldCheck,
  ChefHat,
  UploadCloud,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Cloud,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { signOutUser } from "@/features/auth/actions";
import { getStoredRecipes, fetchRecipesFromDb } from "@/features/recipes/actions";
import { syncAllLocalDataToSupabase, SyncResult } from "@/features/sync/syncService";
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
  const { user } = useAuth();
  const [recipesCount, setRecipesCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncResult | null>(null);

  useEffect(() => {
    if (user?.id) {
      const cached = getStoredRecipes(user.id);
      setRecipesCount(cached.length);
      fetchRecipesFromDb(user.id).then((list) => setRecipesCount(list.length));
    }
  }, [user?.id]);

  const handleManualSync = async () => {
    if (!user?.id || isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await syncAllLocalDataToSupabase(user.id);
      setSyncStatus(res);
      setRecipesCount(res.recipesCount);
    } catch (err) {
      console.warn("Manual sync error:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const name = user?.name || user?.email?.split("@")[0] || "Chef Cuisinier";
  const email = user?.email || "";
  const plan = user?.tier || "Basic";
  const initials = getInitials(user?.name, user?.email);

  return (
    <div className="flex flex-col min-h-[100dvh] sm:min-h-[812px] bg-white px-5 pt-7 pb-28 relative overflow-y-auto">
      <h1 className="text-xl font-extrabold text-[#181A20]">Mon Profil</h1>

      {/* User profile card with Initials Avatar */}
      <div className="mt-6 p-5 rounded-3xl bg-[#F4F6F5] flex items-center gap-4 border border-slate-100">
        <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 bg-gradient-to-tr from-[#181A20] to-[#2C303B] text-white flex items-center justify-center font-extrabold text-lg shadow-sm tracking-wider">
          {initials}
        </div>

        <div className="flex flex-col items-start gap-1">
          <span className="text-base font-extrabold text-[#181A20]">{name}</span>
          {email && <span className="text-xs text-[#8E929E]">{email}</span>}
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] font-bold text-[#181A20] mt-1">
            Plan {plan}
          </span>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
          <ChefHat className="w-5 h-5 text-[#5DB534] mb-1" />
          <span className="text-lg font-extrabold text-[#181A20]">{recipesCount}</span>
          <span className="text-[11px] text-[#8E929E]">Recettes importées</span>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
          <ShieldCheck className="w-5 h-5 text-emerald-600 mb-1" />
          <span className="text-xs font-bold text-emerald-700">AES-256</span>
          <span className="text-[11px] text-[#8E929E]">Chiffrement actif</span>
        </div>
      </div>

      {/* Cloud Synchronization Card */}
      <div className="mt-4 p-4 rounded-3xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Cloud className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-extrabold text-[#181A20] flex items-center gap-1.5">
              <span>Cloud Supabase</span>
              {syncStatus?.success && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              )}
            </span>
            <span className="text-[10px] text-emerald-800 font-medium mt-0.5">
              {syncStatus
                ? `Synchro : ${syncStatus.recipesCount} recettes • ${syncStatus.mealPlansCount} repas • ${syncStatus.shoppingCount} courses`
                : "Synchroniser vos données locales vers le cloud"}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleManualSync}
          disabled={isSyncing}
          className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-[#181A20] border border-emerald-200 text-xs font-bold shadow-2xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#5DB534] ${isSyncing ? "animate-spin" : ""}`} />
          <span>{isSyncing ? "En cours..." : "Synchroniser"}</span>
        </button>
      </div>

      {/* Import Recipes Action Card */}
      <div className="mt-4">
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
                Prenez en photo vos fiches repas avec l'IA
              </span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:translate-x-0.5 transition-transform shrink-0">
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>
      </div>

      {/* Logout Action */}
      <div className="mt-4 space-y-3">
        <button
          type="button"
          onClick={() => signOutUser()}
          className="w-full py-3.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Se déconnecter</span>
        </button>
      </div>

      <BottomNav />
    </div>
  );
}

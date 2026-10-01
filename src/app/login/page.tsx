"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChefHat, Mail, Lock, User, ArrowRight, AlertCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { signInWithCredentials, signUpWithCredentials } from "@/features/auth/actions";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuth();

  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!email || !password) {
      setErrorMessage("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        const res = await signUpWithCredentials(email, password, fullName);
        if (res.success && res.session) {
          setUser(res.session);
          setSuccessMessage("Compte créé avec succès !");
          const redirectTo = searchParams.get("redirectedFrom") || "/";
          setTimeout(() => {
            router.push(redirectTo);
            router.refresh();
          }, 600);
        } else {
          setErrorMessage(res.error || "Une erreur est survenue lors de l'inscription.");
        }
      } else {
        const res = await signInWithCredentials(email, password);
        if (res.success && res.session) {
          setUser(res.session);
          const redirectTo = searchParams.get("redirectedFrom") || "/";
          router.push(redirectTo);
          router.refresh();
        } else {
          setErrorMessage(res.error || "Email ou mot de passe incorrect.");
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Erreur de connexion.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-[0_16px_40px_rgba(0,0,0,0.06)] my-auto">
      {/* Toggle Sign In / Sign Up */}
      <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
        <button
          type="button"
          onClick={() => {
            setIsSignUp(false);
            setErrorMessage("");
            setSuccessMessage("");
          }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
            !isSignUp
              ? "bg-white text-[#181A20] shadow-xs"
              : "text-[#8E929E] hover:text-[#181A20]"
          }`}
        >
          Se connecter
        </button>
        <button
          type="button"
          onClick={() => {
            setIsSignUp(true);
            setErrorMessage("");
            setSuccessMessage("");
          }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
            isSignUp
              ? "bg-white text-[#181A20] shadow-xs"
              : "text-[#8E929E] hover:text-[#181A20]"
          }`}
        >
          Créer un compte
        </button>
      </div>

      {/* Error / Success Notifications */}
      {errorMessage && (
        <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Full Name for Registration */}
        {isSignUp && (
          <div>
            <label className="block text-[11px] font-bold text-[#8E929E] mb-1.5 uppercase tracking-wider">
              Nom complet
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Ex: Axel Coudair"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-50 pl-10 pr-4 py-3 rounded-2xl text-xs text-[#181A20] placeholder-slate-400 border border-slate-200/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#22C55E]/30 transition-all"
              />
            </div>
          </div>
        )}

        {/* Email */}
        <div>
          <label className="block text-[11px] font-bold text-[#8E929E] mb-1.5 uppercase tracking-wider">
            Adresse Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="email"
              required
              placeholder="nom@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 pl-10 pr-4 py-3 rounded-2xl text-xs text-[#181A20] placeholder-slate-400 border border-slate-200/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#22C55E]/30 transition-all"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-[11px] font-bold text-[#8E929E] mb-1.5 uppercase tracking-wider">
            Mot de passe
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 pl-10 pr-4 py-3 rounded-2xl text-xs text-[#181A20] placeholder-slate-400 border border-slate-200/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#22C55E]/30 transition-all"
            />
          </div>
        </div>

        {/* Submit CTA */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 py-3.5 bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white text-xs font-extrabold rounded-full shadow-[0_6px_20px_rgba(34,197,94,0.35)] hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span>{isSignUp ? "Créer mon compte" : "Se connecter"}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F8F9FB] px-6 py-10 selection:bg-emerald-100">
      {/* Top Branding */}
      <div className="flex flex-col items-center text-center mt-6">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#22C55E] to-[#16A34A] text-white flex items-center justify-center shadow-[0_12px_28px_rgba(34,197,94,0.35)] mb-4">
          <ChefHat className="w-9 h-9" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#181A20] tracking-tight">
          Let's <span className="text-[#22C55E]">Cook</span>
        </h1>
        <p className="text-xs text-[#8E929E] mt-1.5 max-w-[260px] leading-relaxed">
          Votre assistant culinaire IA avec chiffrement de bout en bout
        </p>
      </div>

      <Suspense
        fallback={
          <div className="w-full py-16 flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-[#22C55E] border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>

      {/* Footer / Privacy note */}
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 text-[11px] text-[#8E929E] bg-white px-3 py-1.5 rounded-full border border-slate-100 shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Données et recettes chiffrées de bout en bout</span>
        </div>
      </div>
    </div>
  );
}

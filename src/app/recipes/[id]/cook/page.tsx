"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Menu, Volume2, VolumeX, CheckCircle, Sparkles, Timer } from "lucide-react";
import confetti from "canvas-confetti";
import { useAuth } from "@/providers/AuthProvider";
import { Recipe, RecipeStep } from "@/features/recipes/types";
import { getStoredRecipes, fetchRecipesFromDb } from "@/features/recipes/actions";

export default function CookingStepPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const recipeId = params?.id as string;

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (!user?.id || !recipeId) return;

    const all = getStoredRecipes(user.id);
    const found = all.find((r) => r.id === recipeId);
    if (found) {
      setRecipe(found);
    }

    fetchRecipesFromDb(user.id).then((list) => {
      const dbFound = list.find((r) => r.id === recipeId);
      if (dbFound) setRecipe(dbFound);
    });

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis;
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [user?.id, recipeId]);

  const currentStep: RecipeStep | undefined = recipe?.steps?.[currentStepIndex];
  const totalSteps = recipe?.steps?.length || 0;

  const toggleSpeech = () => {
    if (!synthRef.current || !currentStep) return;

    if (isSpeaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
      return;
    }

    synthRef.current.cancel();
    const textToRead = `${currentStep.title}. ${currentStep.description} ${
      currentStep.chefTip ? `Astuce : ${currentStep.chefTip}` : ""
    }`;
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = "fr-FR";
    utterance.rate = 0.95;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  };

  const handleNext = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }

    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setIsCompleted(true);
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#5DB534", "#10B981", "#F59E0B", "#3B82F6"],
        });
      } catch {}
    }
  };

  const handlePrevious = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  if (!recipe || !currentStep) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center text-white bg-slate-950">
        <div className="w-8 h-8 border-3 border-[#5DB534] border-t-transparent rounded-full animate-spin mb-4" />
      </div>
    );
  }

  const stepImage = currentStep.imageUrl || recipe.imageUrl;

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-hidden bg-slate-950 select-none">
      {/* Background Step Image */}
      <div className="absolute inset-0 z-0">
        {stepImage && (
          <img
            src={stepImage}
            alt={currentStep.title}
            className="w-full h-full object-cover object-center filter brightness-90 transition-all duration-700"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/90" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 px-6 pt-7 pb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white active:scale-95 transition-all shadow-lg cursor-pointer"
          title="Retour"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <span className="text-xs font-bold text-white/90 uppercase tracking-widest bg-black/40 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/15">
          Étape {currentStepIndex + 1} / {totalSteps}
        </span>

        <button
          type="button"
          onClick={() => router.push(`/recipes/${recipe.id}`)}
          className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white active:scale-95 transition-all shadow-lg cursor-pointer"
          title="Menu de la recette"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Middle Section: Step Title & Audio Voice Assistant */}
      <div className="relative z-10 px-8 flex flex-col items-center text-center my-auto">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
          {currentStep.title}
        </h2>

        {/* Audio Assistant Pill Button */}
        <button
          type="button"
          onClick={toggleSpeech}
          className={`mt-6 flex items-center gap-3 px-5 py-2.5 rounded-full border transition-all duration-300 shadow-xl cursor-pointer active:scale-95 ${
            isSpeaking
              ? "bg-[#5DB534]/90 border-[#5DB534] text-white ring-4 ring-[#5DB534]/30"
              : "bg-white/20 hover:bg-white/30 backdrop-blur-xl border-white/30 text-white"
          }`}
          title="Écouter les instructions"
        >
          {isSpeaking ? (
            <VolumeX className="w-5 h-5" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}

          <div className="flex items-center gap-1 h-5">
            <span
              className={`w-1 bg-white rounded-full ${
                isSpeaking ? "soundwave-bar" : "h-2"
              }`}
            />
            <span
              className={`w-1 bg-white rounded-full ${
                isSpeaking ? "soundwave-bar" : "h-4"
              }`}
            />
            <span
              className={`w-1 bg-white rounded-full ${
                isSpeaking ? "soundwave-bar" : "h-3"
              }`}
            />
            <span
              className={`w-1 bg-white rounded-full ${
                isSpeaking ? "soundwave-bar" : "h-5"
              }`}
            />
            <span
              className={`w-1 bg-white rounded-full ${
                isSpeaking ? "soundwave-bar" : "h-2"
              }`}
            />
          </div>
        </button>
      </div>

      {/* Bottom Section: Instructions + Navigation */}
      <div className="relative z-10 px-6 pb-8 flex flex-col items-center gap-4">
        <div className="w-full bg-white/20 backdrop-blur-2xl p-5 rounded-[26px] border border-white/25 shadow-2xl text-center">
          <p className="text-sm font-medium text-white leading-relaxed drop-shadow-sm">
            {currentStep.description}
          </p>

          {currentStep.chefTip && (
            <div className="mt-3 p-2.5 bg-black/30 rounded-xl border border-white/15 text-xs text-amber-200">
              💡 <strong>Astuce :</strong> {currentStep.chefTip}
            </div>
          )}

          {currentStep.durationMinutes && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 rounded-full text-[11px] font-semibold text-white/90">
              <Timer className="w-3.5 h-3.5 text-[#5DB534]" />
              <span>Durée estimée : {currentStep.durationMinutes} min</span>
            </div>
          )}
        </div>

        {/* Dots */}
        <div className="flex items-center gap-2 py-1">
          {recipe.steps?.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStepIndex(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentStepIndex
                  ? "w-6 bg-[#5DB534]"
                  : "w-2 bg-white/40 hover:bg-white/60"
              }`}
              title={`Aller à l'étape ${idx + 1}`}
            />
          ))}
        </div>

        {/* Previous / Next */}
        <div className="w-full flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentStepIndex === 0}
            className={`flex-1 py-3.5 rounded-full text-sm font-bold backdrop-blur-xl border transition-all active:scale-95 ${
              currentStepIndex === 0
                ? "bg-white/10 text-white/30 border-white/10 cursor-not-allowed"
                : "bg-white/20 hover:bg-white/30 text-white border-white/25 shadow-lg cursor-pointer"
            }`}
          >
            Précédent
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="flex-1 py-3.5 rounded-full text-sm font-extrabold bg-[#5DB534] hover:bg-[#4FA12A] text-white shadow-[0_8px_20px_rgba(93,181,52,0.45)] transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            {currentStepIndex === totalSteps - 1 ? (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Terminer !</span>
              </>
            ) : (
              <span>Suivant</span>
            )}
          </button>
        </div>
      </div>

      {/* Completion Modal */}
      {isCompleted && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white rounded-[32px] p-7 w-full max-w-sm text-center shadow-2xl flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#5DB534] flex items-center justify-center mb-4">
              <CheckCircle className="w-9 h-9" />
            </div>

            <h3 className="text-xl font-extrabold text-[#181A20]">
              Bon appétit ! 🍽️
            </h3>
            <p className="text-xs text-[#8E929E] mt-2 leading-relaxed">
              Vous avez complété la recette <strong>{recipe.title}</strong> avec succès.
            </p>

            <div className="w-full mt-6 space-y-2.5">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="w-full py-3.5 bg-[#5DB534] text-white text-xs font-bold rounded-full shadow-md hover:bg-[#4FA12A] transition-colors cursor-pointer"
              >
                Retour au menu principal
              </button>
              <button
                type="button"
                onClick={() => setIsCompleted(false)}
                className="w-full py-3 bg-slate-100 text-slate-700 text-xs font-bold rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Revoir les étapes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

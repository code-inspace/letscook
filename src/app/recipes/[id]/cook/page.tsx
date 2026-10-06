"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Menu,
  Volume2,
  VolumeX,
  CheckCircle,
  Sparkles,
  Timer,
} from "lucide-react";
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

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const frenchVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Load voices for Speech Synthesis (especially on iOS / Safari / Chrome)
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const frVoice =
        voices.find((v) => v.lang === "fr-FR" || v.lang === "fr_FR") ||
        voices.find((v) => v.lang.toLowerCase().startsWith("fr")) ||
        voices.find((v) => v.default) ||
        null;
      frenchVoiceRef.current = frVoice;
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

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
  }, [user?.id, recipeId]);

  const currentStep: RecipeStep | undefined = recipe?.steps?.[currentStepIndex];
  const totalSteps = recipe?.steps?.length || 0;

  const stopSpeech = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  // Stop audio whenever step changes
  useEffect(() => {
    stopSpeech();
  }, [currentStepIndex, stopSpeech]);

  const toggleSpeech = () => {
    if (!currentStep) return;

    if (isSpeaking) {
      stopSpeech();
      return;
    }

    // 1. If step has a custom audio recording, play it
    if (currentStep.audioUrl) {
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio(currentStep.audioUrl);
        } else {
          audioRef.current.src = currentStep.audioUrl;
        }

        audioRef.current.onplay = () => setIsSpeaking(true);
        audioRef.current.onended = () => setIsSpeaking(false);
        audioRef.current.onerror = () => {
          setIsSpeaking(false);
          speakWithTTS();
        };
        audioRef.current.play().catch(() => speakWithTTS());
        return;
      } catch {
        speakWithTTS();
        return;
      }
    }

    // 2. Default Speech Synthesis (Text-To-Speech)
    speakWithTTS();
  };

  const speakWithTTS = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !currentStep) {
      return;
    }

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      const textToRead = `${currentStep.title}. ${currentStep.description} ${
        currentStep.chefTip ? `Astuce : ${currentStep.chefTip}` : ""
      }`;

      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.lang = "fr-FR";
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      if (frenchVoiceRef.current) {
        utterance.voice = frenchVoiceRef.current;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (e) => {
        // Canceled events are normal when moving to next step
        if (e.error !== "canceled") {
          console.warn("SpeechSynthesis error:", e);
        }
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("Speech synthesis trigger error:", err);
      setIsSpeaking(false);
    }
  };

  const handleNext = () => {
    stopSpeech();

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
    stopSpeech();
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  if (!recipe || !currentStep) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 text-center text-white bg-black">
        <div className="w-8 h-8 border-3 border-[#5DB534] border-t-transparent rounded-full animate-spin mb-4" />
      </div>
    );
  }

  const stepImage = currentStep.imageUrl || recipe.imageUrl;

  return (
    <div className="fixed inset-0 z-50 w-full h-[100dvh] max-h-[100dvh] bg-black overflow-hidden flex flex-col justify-between select-none touch-none overscroll-none text-white">
      {/* Background Step Image Layer - Pure dark, no white bleed */}
      <div className="absolute inset-0 z-0 bg-black pointer-events-none overflow-hidden">
        {stepImage ? (
          <img
            src={stepImage}
            alt={currentStep.title}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
            className="w-full h-full object-cover object-center filter brightness-[0.75] transition-all duration-700"
          />
        ) : (
          <div className="w-full h-full bg-[#1A1A1A]" />
        )}
        {/* Dark Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/45 to-black/95" />
      </div>

      {/* Top Header with Safe Area Inset */}
      <header className="relative z-10 px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            stopSpeech();
            router.back();
          }}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white active:scale-95 transition-all shadow-lg cursor-pointer"
          title="Retour"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <span className="text-[11px] font-bold text-white/95 uppercase tracking-widest bg-black/50 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/20">
          Étape {currentStepIndex + 1} / {totalSteps}
        </span>

        <button
          type="button"
          onClick={() => {
            stopSpeech();
            router.push(`/recipes/${recipe.id}`);
          }}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white active:scale-95 transition-all shadow-lg cursor-pointer"
          title="Menu de la recette"
        >
          <Menu className="w-4 h-4" />
        </button>
      </header>

      {/* Middle Section: Step Title & Audio Voice Assistant */}
      <div className="relative z-10 px-6 flex flex-col items-center text-center my-auto">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight drop-shadow-md max-w-sm">
          {currentStep.title}
        </h2>

        {/* Audio Assistant Pill Button */}
        <button
          type="button"
          onClick={toggleSpeech}
          className={`mt-4 flex items-center gap-3 px-5 py-2.5 rounded-full border transition-all duration-300 shadow-xl cursor-pointer active:scale-95 ${
            isSpeaking
              ? "bg-[#5DB534] border-[#5DB534] text-white ring-4 ring-[#5DB534]/30"
              : "bg-black/50 hover:bg-black/70 backdrop-blur-xl border-white/25 text-white"
          }`}
          title={isSpeaking ? "Arrêter la lecture" : "Écouter les instructions"}
        >
          {isSpeaking ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}

          <div className="flex items-center gap-1 h-4">
            <span
              className={`w-1 bg-white rounded-full transition-all duration-200 ${
                isSpeaking ? "soundwave-bar" : "h-2"
              }`}
            />
            <span
              className={`w-1 bg-white rounded-full transition-all duration-200 ${
                isSpeaking ? "soundwave-bar" : "h-3.5"
              }`}
            />
            <span
              className={`w-1 bg-white rounded-full transition-all duration-200 ${
                isSpeaking ? "soundwave-bar" : "h-2.5"
              }`}
            />
            <span
              className={`w-1 bg-white rounded-full transition-all duration-200 ${
                isSpeaking ? "soundwave-bar" : "h-4"
              }`}
            />
            <span
              className={`w-1 bg-white rounded-full transition-all duration-200 ${
                isSpeaking ? "soundwave-bar" : "h-2"
              }`}
            />
          </div>
        </button>
      </div>

      {/* Bottom Section: Instructions + Navigation */}
      <div className="relative z-10 px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] flex flex-col items-center gap-3 w-full max-w-md mx-auto">
        <div className="w-full bg-black/65 backdrop-blur-2xl p-4 rounded-[22px] border border-white/20 shadow-2xl text-center">
          <p className="text-xs sm:text-sm font-medium text-white/95 leading-relaxed drop-shadow-sm max-h-[130px] overflow-y-auto">
            {currentStep.description}
          </p>

          {currentStep.chefTip && (
            <div className="mt-2.5 p-2 bg-white/10 rounded-xl border border-white/15 text-[11px] text-amber-200 font-medium">
              💡 <strong>Astuce :</strong> {currentStep.chefTip}
            </div>
          )}

          {currentStep.durationMinutes && (
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 rounded-full text-[10px] font-semibold text-white/90">
              <Timer className="w-3 h-3 text-[#5DB534]" />
              <span>Durée estimée : {currentStep.durationMinutes} min</span>
            </div>
          )}
        </div>

        {/* Dots */}
        <div className="flex items-center gap-1.5 py-0.5">
          {recipe.steps?.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                stopSpeech();
                setCurrentStepIndex(idx);
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentStepIndex
                  ? "w-6 bg-[#5DB534]"
                  : "w-1.5 bg-white/40 hover:bg-white/60"
              }`}
              title={`Aller à l'étape ${idx + 1}`}
            />
          ))}
        </div>

        {/* Previous / Next Buttons */}
        <div className="w-full flex items-center gap-2.5">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentStepIndex === 0}
            className={`flex-1 py-3.5 rounded-2xl text-xs sm:text-sm font-bold backdrop-blur-xl border transition-all active:scale-95 ${
              currentStepIndex === 0
                ? "bg-white/5 text-white/20 border-white/5 cursor-not-allowed"
                : "bg-black/50 hover:bg-black/70 text-white border-white/20 shadow-lg cursor-pointer"
            }`}
          >
            Précédent
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="flex-1 py-3.5 rounded-2xl text-xs sm:text-sm font-extrabold bg-[#5DB534] hover:bg-[#4FA12A] text-white shadow-[0_8px_20px_rgba(93,181,52,0.45)] transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white rounded-[32px] p-7 w-full max-w-sm text-center shadow-2xl flex flex-col items-center text-slate-900">
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

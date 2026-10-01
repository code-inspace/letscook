"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Menu, X, Check } from "lucide-react";

interface StepsSheetProps {
  recipeSlug: string;
  currentOrder: number;
  steps: { order: number; title: string }[];
}

export function StepsSheet({
  recipeSlug,
  currentOrder,
  steps,
}: StepsSheetProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Top Bar Navigation */}
      <div className="relative z-30 flex items-center justify-between px-5 pt-6 w-full pointer-events-auto">
        {/* Back to Recipe Detail Chevron */}
        <Link
          href={`/recipe/${recipeSlug}`}
          className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 backdrop-blur-md flex items-center justify-center text-white transition-all active:scale-95"
          aria-label="Retour au détail de la recette"
        >
          <ChevronLeft className="w-4 h-4 text-white" strokeWidth={1.5} />
        </Link>

        {/* 2-line Menu Button for Steps list sheet */}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 backdrop-blur-md flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer"
          aria-label="Afficher la liste des étapes"
        >
          <div className="flex flex-col gap-1 items-center justify-center w-4">
            <span className="w-full h-[1.5px] bg-white rounded-full" />
            <span className="w-full h-[1.5px] bg-white rounded-full" />
          </div>
        </button>
      </div>

      {/* Glass Bottom Sheet Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-[375px] mx-auto bg-black/75 border-t border-white/20 backdrop-blur-2xl rounded-t-[32px] p-6 text-white max-h-[75vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <span className="text-[13px] font-medium tracking-tight">
                Toutes les étapes ({steps.length})
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Fermer"
              >
                <X className="w-4 h-4 text-white" strokeWidth={1.5} />
              </button>
            </div>

            {/* List */}
            <div className="mt-4 flex flex-col gap-2 overflow-y-auto pr-1">
              {steps.map((s) => {
                const isActive = s.order === currentOrder;
                const isPassed = s.order < currentOrder;

                return (
                  <Link
                    key={s.order}
                    href={`/recipe/${recipeSlug}/step/${s.order}`}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                      isActive
                        ? "bg-[#5DB534]/30 border border-[#5DB534]/50"
                        : "bg-white/10 hover:bg-white/15"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-normal ${
                          isActive
                            ? "bg-[#5DB534] text-white"
                            : isPassed
                            ? "bg-white/20 text-white"
                            : "bg-white/10 text-white/60"
                        }`}
                      >
                        {isPassed ? (
                          <Check className="w-3 h-3" strokeWidth={2} />
                        ) : (
                          s.order
                        )}
                      </span>
                      <span className="text-[12px] font-normal text-white truncate max-w-[210px]">
                        {s.title}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

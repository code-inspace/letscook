import React from "react";
import { notFound } from "next/navigation";
import { getStep } from "@/lib/queries";
import { StepBackground } from "@/components/step/StepBackground";
import { StepsSheet } from "@/components/step/StepsSheet";
import { AudioPill } from "@/components/step/AudioPill";
import { InstructionCard } from "@/components/step/InstructionCard";
import { StepMarker } from "@/components/step/StepMarker";
import { StepControls } from "@/components/step/StepControls";

interface StepPageProps {
  params: Promise<{ slug: string; order: string }>;
}

export default async function StepPage({ params }: StepPageProps) {
  const { slug, order: orderStr } = await params;
  const orderNum = parseInt(orderStr, 10);

  if (isNaN(orderNum) || orderNum < 1) {
    notFound();
  }

  const data = await getStep(slug, orderNum);

  if (!data) {
    notFound();
  }

  const { step, recipeSlug, totalSteps, allSteps } = data;

  return (
    <div className="relative w-full h-[100dvh] sm:min-h-[812px] sm:h-[812px] flex flex-col justify-between overflow-hidden select-none">
      {/* 1. Fullscreen background image with blur & gradient overlay */}
      <StepBackground imageUrl={step.imageUrl} title={step.title} />

      {/* 2. Top bar with Chevron Back and 2-line Steps Sheet Menu */}
      <StepsSheet
        recipeSlug={recipeSlug}
        currentOrder={step.order}
        steps={allSteps}
      />

      {/* Main Content Area */}
      <div className="relative z-20 flex flex-col flex-1 px-5 pointer-events-none">
        {/* 3. Step Title (centered, white, 24px, weight 300) */}
        <h1 className="text-center text-white text-[24px] font-light leading-tight tracking-tight mt-5 max-w-[280px] mx-auto pointer-events-auto">
          {step.title}
        </h1>

        {/* 4. Audio Pill with 9-bar waveform */}
        <div className="pointer-events-auto">
          <AudioPill audioUrl={step.audioUrl} />
        </div>

        {/* 5. Instruction Card floating at ~55% height */}
        <InstructionCard instruction={step.instruction} />

        {/* 6. Precision Marker on photo if markerX and markerY are present */}
        <StepMarker markerX={step.markerX} markerY={step.markerY} />
      </div>

      {/* 7 & 8. Progress indicator & Bottom Pill Controls (Previous / Next / Finish) */}
      <StepControls
        recipeSlug={recipeSlug}
        order={step.order}
        totalSteps={totalSteps}
      />
    </div>
  );
}

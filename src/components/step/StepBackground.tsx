import React from "react";
import Image from "next/image";

interface StepBackgroundProps {
  imageUrl: string;
  title: string;
}

export function StepBackground({ imageUrl, title }: StepBackgroundProps) {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden select-none bg-black">
      {/* Base full-frame image */}
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={title}
          fill
          className="object-cover object-center brightness-[0.75]"
          priority
          sizes="100vw"
        />
      ) : (
        <div className="w-full h-full bg-[#1A1A1A]" />
      )}

      {/* Multistage dark gradient overlay - pure dark, zero white bleed */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.45) 45%, rgba(0, 0, 0, 0.95) 100%)",
        }}
      />
    </div>
  );
}

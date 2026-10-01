import React from "react";
import Image from "next/image";

interface StepBackgroundProps {
  imageUrl: string;
  title: string;
}

export function StepBackground({ imageUrl, title }: StepBackgroundProps) {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden select-none">
      {/* Base full-frame image */}
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={title}
          fill
          className="object-cover object-center"
          priority
          sizes="(max-width: 768px) 100vw, 375px"
        />
      ) : (
        <div className="w-full h-full bg-[#4A3B32]" />
      )}

      {/* Top blur overlay layer masked with gradient */}
      <div
        className="absolute top-0 left-0 right-0 h-[45%] backdrop-blur-md"
        style={{
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)",
        }}
      />

      {/* Multistage gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(120, 85, 60, 0.75) 0%, rgba(60, 40, 30, 0.20) 45%, rgba(0, 0, 0, 0.25) 100%)",
        }}
      />
    </div>
  );
}

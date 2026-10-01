"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="p-1 -ml-1 text-[#1C1C1C] hover:opacity-70 transition-opacity cursor-pointer"
      aria-label="Retour"
    >
      <ChevronLeft className="w-[18px] h-[18px]" strokeWidth={1.5} />
    </button>
  );
}

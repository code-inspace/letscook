import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] sm:min-h-[812px] bg-white px-5 text-center">
      <h1 className="text-[24px] font-normal text-[#1C1C1C]">404</h1>
      <p className="text-[12px] text-[#9B9B9B] mt-2">
        La recette ou l'étape demandée n'existe pas.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 h-10 px-5 rounded-full bg-[#F4F6F5] hover:bg-[#ECEEED] text-[12px] font-normal text-[#1C1C1C] transition-all active:scale-95"
      >
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
        <span>Retour à l'accueil</span>
      </Link>
    </div>
  );
}

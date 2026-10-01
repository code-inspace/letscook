import React from "react";

interface InstructionCardProps {
  instruction: string;
}

export function InstructionCard({ instruction }: InstructionCardProps) {
  if (!instruction) return null;

  return (
    <div
      className="absolute left-5 w-[160px] p-4 rounded-2xl bg-white/15 border border-white/25 backdrop-blur-md shadow-lg z-20 pointer-events-auto"
      style={{ top: "54%" }}
    >
      <p className="text-[10px] font-normal text-white leading-[1.6]">
        {instruction}
      </p>
    </div>
  );
}

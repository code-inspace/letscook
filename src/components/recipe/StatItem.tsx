import React from "react";

interface StatItemProps {
  value: string | number;
  label: string;
}

export function StatItem({ value, label }: StatItemProps) {
  return (
    <div className="flex flex-col items-start gap-0.5">
      <span className="text-[12px] font-normal text-[#1C1C1C] leading-tight">
        {value}
      </span>
      <span className="text-[10px] font-normal text-[#9B9B9B] leading-tight">
        {label}
      </span>
    </div>
  );
}

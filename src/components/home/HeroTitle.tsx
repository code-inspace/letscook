import React from "react";
import { HeroConfig } from "@/lib/config";

interface HeroTitleProps {
  config: HeroConfig;
}

export function HeroTitle({ config }: HeroTitleProps) {
  return (
    <section className="relative px-5 mt-6 overflow-hidden">
      {/* Concentric SVG Arcs background decoration */}
      <svg
        className="absolute right-[-40px] top-[-15px] w-[180px] h-[180px] pointer-events-none opacity-90 select-none"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="160" cy="40" r="45" stroke="#EDEDED" strokeWidth="1" />
        <circle cx="160" cy="40" r="75" stroke="#EDEDED" strokeWidth="1" />
        <circle cx="160" cy="40" r="105" stroke="#EDEDED" strokeWidth="1" />
        <circle cx="160" cy="40" r="135" stroke="#EDEDED" strokeWidth="1" />
        <circle cx="160" cy="40" r="165" stroke="#EDEDED" strokeWidth="1" />
      </svg>

      <h1 className="relative z-10 text-[28px] font-normal leading-[1.2] text-[#1C1C1C] tracking-tight max-w-[240px]">
        {config.prefix} <span className="text-[#5DB534]">{config.highlight}</span>
        <br />
        {config.suffix}
      </h1>
    </section>
  );
}

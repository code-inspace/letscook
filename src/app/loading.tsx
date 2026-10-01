import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col min-h-[100dvh] sm:min-h-[812px] bg-white p-5 space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-3">
          <Skeleton shape="rounded-xl" className="w-10 h-10" />
          <div className="flex flex-col gap-1.5">
            <Skeleton shape="rectangle" className="w-24 h-3.5" />
            <Skeleton shape="pill" className="w-12 h-3" />
          </div>
        </div>
        <Skeleton shape="rounded-xl" className="w-10 h-10" />
      </div>

      {/* Hero Title Skeleton */}
      <div className="space-y-2 pt-2">
        <Skeleton shape="rectangle" className="w-48 h-7" />
        <Skeleton shape="rectangle" className="w-36 h-7" />
      </div>

      {/* Horizontal Chips Skeleton */}
      <div className="flex items-center gap-3 overflow-hidden py-1">
        <Skeleton shape="pill" className="w-28 h-[52px] shrink-0" />
        <Skeleton shape="pill" className="w-32 h-[52px] shrink-0" />
        <Skeleton shape="pill" className="w-24 h-[52px] shrink-0" />
      </div>

      {/* Featured Dish Photo & Card Skeleton */}
      <div className="flex flex-col items-center mt-4">
        <Skeleton shape="circle" className="w-[230px] h-[230px]" />
        <Skeleton
          shape="rounded-2xl"
          className="w-[210px] h-[72px] -mt-[50px] shadow-sm"
        />
      </div>
    </div>
  );
}

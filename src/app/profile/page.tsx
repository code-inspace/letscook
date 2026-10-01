import React from "react";
import Image from "next/image";
import { getCurrentUser } from "@/lib/queries";
import { BottomNav } from "@/components/layout/BottomNav";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  const formattedPlan =
    user.plan.charAt(0).toUpperCase() + user.plan.slice(1).toLowerCase();

  return (
    <div className="flex flex-col min-h-[100dvh] sm:min-h-[812px] bg-white px-5 pt-7 pb-24 relative overflow-y-auto">
      <h1 className="text-[24px] font-normal text-[#1C1C1C]">Profil</h1>

      {/* User profile card */}
      <div className="mt-6 p-5 rounded-2xl bg-[#F4F6F5] flex items-center gap-4">
        <div className="relative w-14 h-14 rounded-2xl overflow-hidden shrink-0 bg-white">
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={user.name}
              width={56}
              height={56}
              className="w-full h-full object-cover"
            />
          ) : null}
        </div>

        <div className="flex flex-col items-start gap-1">
          <span className="text-[15px] font-medium text-[#1C1C1C]">
            {user.name}
          </span>
          <span className="inline-block px-2.5 py-0.5 rounded-full border border-[#1C1C1C] text-[10px] font-normal text-[#1C1C1C]">
            Plan {formattedPlan}
          </span>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

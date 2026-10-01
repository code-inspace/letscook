import React from "react";

interface PhoneFrameProps {
  children: React.ReactNode;
}

export function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <div className="w-full min-h-screen flex items-center justify-center p-0 sm:p-6 bg-[#E8ECEB]">
      <main
        id="app-root"
        className="w-full max-w-[375px] min-h-[100dvh] sm:min-h-[812px] sm:max-h-[860px] sm:h-[812px] bg-white sm:rounded-[32px] shadow-[0_8px_24px_rgba(0,0,0,0.06)] relative overflow-x-hidden overflow-y-auto flex flex-col font-sans border-0 sm:border sm:border-black/[0.04]"
      >
        {children}
      </main>
    </div>
  );
}

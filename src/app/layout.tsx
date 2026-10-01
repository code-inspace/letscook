import type { Metadata, Viewport } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/providers/AuthProvider";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Let's Cook - Smart AI Cooking & Recipe Assistant",
  description: "Cook Special Every Day with AI recipe extraction, smart steps and encrypted storage",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Let's Cook",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#22C55E",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${outfit.variable} ${inter.variable}`}>
      <body className="font-sans antialiased bg-[#ECEEF2] text-[#181A20] min-h-screen flex justify-center selection:bg-emerald-100 selection:text-emerald-900">
        <AuthProvider>
          <div className="w-full max-w-[440px] min-h-screen bg-[#F8F9FB] flex flex-col shadow-2xl relative overflow-x-hidden border-x border-slate-200/60">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}

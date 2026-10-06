import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { PhoneFrame } from "@/components/layout/PhoneFrame";
import { AuthProvider } from "@/providers/AuthProvider";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Let's Cook - Recipe App",
  description: "Cook Special Every Day with pure minimalism & step-by-step recipes",
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
  themeColor: "#5DB534",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={poppins.variable}>
      <body className="antialiased bg-[#E8ECEB] text-[#1C1C1C]">
        <AuthProvider>
          <ServiceWorkerRegister />
          <PhoneFrame>{children}</PhoneFrame>
        </AuthProvider>
      </body>
    </html>
  );
}

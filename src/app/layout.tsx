import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { PhoneFrame } from "@/components/layout/PhoneFrame";
import { AuthProvider } from "@/providers/AuthProvider";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Let's Cook - Recipe App",
  description: "Cook Special Every Day with pure minimalism & step-by-step recipes",
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
          <PhoneFrame>{children}</PhoneFrame>
        </AuthProvider>
      </body>
    </html>
  );
}

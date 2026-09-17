import type { Metadata } from "next";
import { BKQuickAccess } from "@/components/bk/BKQuickAccess";
import { PWARegister } from "@/components/pwa/PWARegister";
import "./globals.css";
import "./smart.css";
import "./bk-v2.css";
import "./student-plan.css";
import "./career-v2.css";
import "./career-admin.css";
import "./stage6.css";

export const metadata: Metadata = {
  title: "Bina Insan LifeMap",
  description: "Student development, asesmen BK, Life Map, karier, action plan, dan pendampingan Bina Insan Palu High School.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        {children}
        <BKQuickAccess />
        <PWARegister />
      </body>
    </html>
  );
}

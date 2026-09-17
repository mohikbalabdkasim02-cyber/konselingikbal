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
import "./stage6-polish.css";

export const metadata: Metadata = {
  title: "Bina Insan LifeMap",
  description: "Student development, asesmen BK, Life Map, karier, action plan, dan pendampingan Bina Insan Palu High School.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bina Insan LifeMap",
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

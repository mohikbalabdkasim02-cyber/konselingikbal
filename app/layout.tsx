import type { Metadata } from "next";
import { BKQuickAccess } from "@/components/bk/BKQuickAccess";
import "./globals.css";
import "./smart.css";
import "./bk-v2.css";
import "./student-plan.css";
import "./career-v2.css";
import "./career-admin.css";

export const metadata: Metadata = {
  title: "Bina Insan LifeMap",
  description: "Dashboard pemantauan siswa, karier, dan konseling Bina Insan Palu",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}<BKQuickAccess/></body>
    </html>
  );
}

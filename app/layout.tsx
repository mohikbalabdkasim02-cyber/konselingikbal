import type { Metadata } from "next";
import "./globals.css";
import "./smart.css";
import "./bk-v2.css";

export const metadata: Metadata = {
  title: "Bina Insan LifeMap",
  description: "Dashboard pemantauan siswa, karier, dan konseling Bina Insan Palu",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}

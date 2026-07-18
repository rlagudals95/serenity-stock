import { Fragment_Mono, Gothic_A1 } from "next/font/google";
import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";

import "./globals.css";

const gothic = Gothic_A1({
  variable: "--font-gothic",
  weight: ["400", "500", "600", "700"],
  preload: false,
});

const fragment = Fragment_Mono({
  variable: "--font-data",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Serenity Intelligence",
  description: "Serenity 투자 관점과 원문을 추적하는 개인 리서치 도구",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={`${gothic.variable} ${fragment.variable}`} lang="ko">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

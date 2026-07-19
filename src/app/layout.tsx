import { Fragment_Mono, Gothic_A1 } from "next/font/google";
import { headers } from "next/headers";
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

const title = "Public Investor Intelligence";
const description =
  "성장주 분석가들의 공개 투자 관점과 원문을 비교하는 리서치 도구";

export async function generateMetadata(): Promise<Metadata> {
  const incoming = await headers();
  const host = incoming.get("x-forwarded-host") ?? incoming.get("host");
  const protocol = incoming.get("x-forwarded-proto") ?? "http";
  const origin = host ? `${protocol}://${host}` : "http://localhost:3000";
  const image = new URL("/og.png", origin).toString();

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: image, width: 1732, height: 908 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

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

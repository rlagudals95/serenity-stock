import { headers } from "next/headers";
import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";
import {
  AppBehaviorLoggerProvider,
  BehaviorPageViewTracker,
} from "@/lib/user-behavior-log/react/app-behavior-provider";

import "./globals.css";

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
    <html lang="ko">
      <body>
        <AppBehaviorLoggerProvider>
          <BehaviorPageViewTracker />
          <AppShell>{children}</AppShell>
        </AppBehaviorLoggerProvider>
      </body>
    </html>
  );
}

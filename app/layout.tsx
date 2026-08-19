import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

import { BottomNav } from "@/components/BottomNav";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { ThemeEffect } from "@/components/ThemeEffect";
import { ThemeScript } from "@/components/ThemeScript";
import { ToastViewport } from "@/components/ToastViewport";
import { WaterDataProvider } from "@/hooks/useWaterData";
import { ToastProvider } from "@/hooks/useToast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://water-tracker.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Water Tracker — Track Your Daily Water Intake",
  description:
    "A simple and beautiful water tracker to help you track your daily water intake.",
  applicationName: "Water Tracker",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Water Tracker",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Water Tracker — Track Your Daily Water Intake",
    description:
      "A simple and beautiful water tracker to help you track your daily water intake.",
    url: SITE_URL,
    siteName: "Water Tracker",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Water Tracker — Track Your Daily Water Intake",
    description:
      "A simple and beautiful water tracker to help you track your daily water intake.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <WaterDataProvider>
          <ToastProvider>
            <ThemeEffect />
            <ServiceWorkerRegister />
            {children}
            <BottomNav />
            <ToastViewport />
          </ToastProvider>
        </WaterDataProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import SiteShell from "../components/SiteShell";

export const metadata: Metadata = {
  title: "বাজার দর | আজকের বাজারের দাম এক নজরে",
  description:
    "চাল, ডাল, তেল, সবজি, মাছ, মাংসসহ নিত্যপ্রয়োজনীয় পণ্যের আজকের বাজারদর এবং দাম বৃদ্ধি ও হ্রাসের তথ্য দেখুন।",
  applicationName: "বাজার দর",
  keywords: [
    "বাজার দর",
    "আজকের বাজারদর",
    "বাংলাদেশের বাজার",
    "নিত্যপ্রয়োজনীয় পণ্যের দাম",
    "চালের দাম",
    "সবজির দাম",
  ],
  openGraph: {
    title: "বাজার দর | আজকের বাজারের দাম এক নজরে",
    description:
      "প্রতিদিনের বাজারদর, দাম বৃদ্ধি ও হ্রাসের তথ্য এক জায়গায়।",
    locale: "bn_BD",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f0f5f0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="bn">
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
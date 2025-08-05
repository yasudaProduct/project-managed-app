import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SideMenu } from "@/components/side-menu";
import { Header } from "@/components/header";
import { Toaster } from "@/components/ui/toaster";
import ProgressBar from "@/components/progress-bar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "プロジェクト管理",
  description: "プロジェクト管理",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ProgressBar>
          <SideMenu />
          <Header />
          <main className="pt-16">
            {children}
          </main>
          <Toaster />
        </ProgressBar>
      </body>
    </html>
  );
}

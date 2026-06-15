import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { ChatBot } from "@/components/ChatBot";
import { AuthProvider } from "@/components/AuthProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SplitSense — Shared Expenses Tracker",
  description: "Track shared expenses, detect anomalies in your data, and settle up with housemates. Built for tracking shared expenses with AI.",
  keywords: ["expenses", "split", "roommates", "tracker", "shared expenses"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="min-h-screen bg-transparent text-slate-100 font-[family-name:var(--font-inter)] antialiased">
        <AuthProvider>
          <div className="aurora-bg">
            <div className="aurora-blob aurora-blob-1" />
            <div className="aurora-blob aurora-blob-2" />
            <div className="aurora-blob aurora-blob-3" />
          </div>
          <div className="flex flex-col min-h-screen relative z-10">
            <div className="app-container flex-1 flex flex-col">
              <main className="flex-1 p-4 md:p-8 pb-48 md:pb-56 max-w-[1800px] mx-auto w-full">
                {children}
              </main>
            </div>
            <ChatBot />
            <Sidebar />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}

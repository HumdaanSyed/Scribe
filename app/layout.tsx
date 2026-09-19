import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

// UI and body: Inter. Numbers, timestamps, durations: JetBrains Mono
// (PLAN.md section 13). Both fall back to real system stacks in globals.css.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Scribe",
  description: "Live meeting transcription with AI summaries, Q&A, and PDF export.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-bg font-sans text-fg">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { AppLayout } from "@/components/AppLayout";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "ApplyAI - Autonomous Job Application Platform",
  description: "Automate your job search. ApplyAI parses resumes, analyzes skill gaps, customizes resumes/cover letters with Claude, and sends automated applications.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased scroll-smooth">
      <body className="min-h-full flex flex-col font-sans selection:bg-cyan-500/25 selection:text-cyan-400 transition-colors duration-300">
        <ThemeProvider>
          <AppLayout>{children}</AppLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}

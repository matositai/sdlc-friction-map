import type { Metadata } from "next";
import { Inter, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SDLC Friction Map · EA Developer Platform",
  description: "CI/CD pipeline health, DORA metrics, and AI-powered friction analysis for EA game studios",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${geistMono.variable} h-full dark`}
    >
      <body className="min-h-full" style={{ backgroundColor: "var(--nc-void)", color: "var(--foreground)" }}>
        <ErrorBoundary>
          <TooltipProvider>
            {/* Skip to main content link for keyboard navigation */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-60 focus:z-50 focus:px-4 focus:py-2 focus:rounded focus:text-sm focus:font-medium"
              style={{ backgroundColor: "var(--nc-cyan)", color: "var(--nc-void)" }}
            >
              Skip to main content
            </a>
            <div className="flex min-h-screen">
              <Sidebar />
              <div id="main-content" className="flex-1 ml-56 flex flex-col min-h-screen">
                {children}
              </div>
            </div>
          </TooltipProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

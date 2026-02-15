import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { LanguageProvider } from "@/hooks/use-language";
import { FirebaseProvider } from "@/lib/firebase/provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { RightSidebar } from "@/app/components/right-sidebar";
import { Playfair_Display, PT_Sans } from "next/font/google";
import { cn } from "@/lib/utils";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import BottomNav from "@/components/navigation/BottomNav";
import Script from "next/script";

// NEW (Correct imports)
import { ConditionalOmSymbol } from "@/components/ConditionalOmSymbol";
import { NightModeToggle } from "@/components/NightModeToggle";
import BackgroundMusicWrapper from "@/components/music/BackgroundMusicWrapper"; // ✅ Default import
import { ChunkErrorHandler } from "@/components/ChunkErrorHandler";
import { ConsoleErrorFilter } from "@/components/ConsoleErrorFilter";
import { ActiveVideoProvider } from "@/contexts/ActiveVideoContext";
import { MaintenanceBanner } from "@/components/MaintenanceBanner";

const fontHeadline = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-headline",
});

const fontBody = PT_Sans({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-body",
});

export const metadata = {
  title: "Aaura - Your Daily Dose of Spiritual Wellness",
  description:
    "Discover Hindu deities, temples, rituals, epic sagas, and connect with a vibrant spiritual community. Your daily dose of spiritual wellness.",
  keywords: [
    "spiritual",
    "hindu",
    "deities",
    "temples",
    "rituals",
    "mantras",
    "spirituality",
    "wellness",
  ],
  authors: [{ name: "Aaura Team" }],
  openGraph: {
    title: "Aaura - Your Daily Dose of Spiritual Wellness",
    description:
      "Discover Hindu deities, temples, rituals, epic sagas, and connect with a vibrant spiritual community.",
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aaura - Your Daily Dose of Spiritual Wellness",
    description:
      "Discover Hindu deities, temples, rituals, epic sagas, and connect with a vibrant spiritual community.",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon.ico", rel: "shortcut icon" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    other: [{ rel: "mask-icon", url: "/icons/android-chrome-512x512.png", color: "#7E2275" }],
  },
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
  },
  // Enable Safari Reader Mode by ensuring proper meta tags
  other: {
    // These meta tags help Safari detect article-like content for Reader Mode
    'article:author': 'Aaura Team',
    'article:publisher': 'Aaura',
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Enable Safari Reader Mode - these meta tags help Safari detect readable content */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        {/* Don't force standalone mode in Safari - allows Reader Mode to work */}
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Google AdSense site verification */}
        <meta
          name="google-adsense-account"
          content="ca-pub-7841158611461633"
        />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-sans text-foreground antialiased",
          fontHeadline.variable,
          fontBody.variable
        )}
      >
        <FirebaseProvider>
          <LanguageProvider>
            <ActiveVideoProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
              >
                {/* Suppress web-share warnings from third-party scripts (Razorpay, etc.) - must be early */}
                {typeof window !== 'undefined' && (
                  <script
                    dangerouslySetInnerHTML={{
                      __html: `
                        (function() {
                          if (typeof console !== 'undefined') {
                            const originalWarn = console.warn;
                            const originalLog = console.log;
                            console.warn = function(...args) {
                              const msg = args.join(' ').toLowerCase();
                              if (msg.includes('unrecognized feature') && msg.includes('web-share')) {
                                return; // Suppress web-share warnings
                              }
                              originalWarn.apply(console, args);
                            };
                            console.log = function(...args) {
                              const msg = args.join(' ').toLowerCase();
                              if (msg.includes('unrecognized feature') && msg.includes('web-share')) {
                                return; // Suppress web-share warnings
                              }
                              originalLog.apply(console, args);
                            };
                          }
                        })();
                      `,
                    }}
                  />
                )}
                <ErrorBoundary>
                <ChunkErrorHandler />
                <ConsoleErrorFilter />
                {process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID && (
                  <Script
                    id="google-adsense-script"
                    strategy="afterInteractive"
                    async
                    src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}`}
                    crossOrigin="anonymous"
                  />
                )}

                {/* MAINTENANCE BANNER */}
                <MaintenanceBanner />

                {/* UI TOP BUTTONS */}
                <NightModeToggle />
                <ConditionalOmSymbol />

                <div className="app-shell">
                  <TopNav />

                  <div className="flex flex-1 overflow-hidden bg-background">
                    <Sidebar />

                    <main
                      className="flex-1 overflow-y-auto min-w-0"
                      role="main"
                    >
                      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10">
                        {children}
                      </div>
                    </main>

                    <aside
                      className="hidden w-80 shrink-0 overflow-y-auto border-l p-4 xl:block"
                      role="complementary"
                      aria-label="Sidebar"
                    >
                      <RightSidebar />
                    </aside>
                  </div>
                </div>
              </ErrorBoundary>

              {/* PWA */}
              <ServiceWorkerRegister />
              <PWAInstallPrompt />

              {/* NAVIGATION */}
              <BottomNav />

              {/* BACKGROUND MUSIC (Correct) */}
              <BackgroundMusicWrapper />

              {/* TOASTER */}
              <Toaster />
            </ThemeProvider>
            </ActiveVideoProvider>
          </LanguageProvider>
        </FirebaseProvider>
      </body>
    </html>
  );
}

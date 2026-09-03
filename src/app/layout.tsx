import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Devanagari } from "next/font/google";
import "@/styles/globals.css";
import { IntroCurtain } from "@/components/IntroCurtain";
import { LanguageProvider } from "@/i18n/context";
import { BetaBanner } from "@/components/BetaBanner";

// design.md: single Latin typeface Inter; Noto Sans Devanagari carries Marathi (addendum §5).
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-latin",
  display: "swap",
});

const devanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-devanagari",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Adig — check your electricity bill",
  description:
    "Adig helps you check whether your electricity bill was overcharged, estimate by how much, and generate the right complaint to get it corrected. Guidance, not legal advice.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#8ed462",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${devanagari.variable}`} suppressHydrationWarning>
      <body>
        {/* Pre-paint: hide the intro curtain BEFORE first paint for repeat-in-session / reduced-motion
            visitors, so it never flashes for them. First-time visitors keep it (it's in the initial HTML,
            covering the page → strict curtain→landing order, no landing flash). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(sessionStorage.getItem('adig_intro_seen')||matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.setAttribute('data-adig-intro','skip')}}catch(e){}",
          }}
        />
        <noscript>
          <style>{`.adig-intro{display:none!important}`}</style>
        </noscript>
        <IntroCurtain />
        <LanguageProvider>
          <BetaBanner />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}

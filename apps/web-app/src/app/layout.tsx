import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Bebas_Neue, Cormorant_Garamond, Fredoka, Inter, Roboto_Mono } from "next/font/google";

import { APP_DESCRIPTION, APP_NAME_CAPITALIZED } from "@/lib/branding";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-roboto-mono",
  display: "swap",
});

const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant-garamond",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  variable: "--font-bebas-neue",
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: APP_NAME_CAPITALIZED,
  description: APP_DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={cn(
        "h-full font-sans",
        inter.variable,
        robotoMono.variable,
        cormorantGaramond.variable,
        fredoka.variable,
        bebasNeue.variable,
      )}
    >
      <body className="min-h-full">
        {children}
        <Analytics />
      </body>
    </html>
  );
}

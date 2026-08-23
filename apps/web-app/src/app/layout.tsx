import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import {
  Bebas_Neue,
  Comfortaa,
  Cormorant_Garamond,
  Days_One,
  Delius_Unicase,
  Fredoka,
  Inter,
  Lato,
  Lobster,
  Pacifico,
  Roboto,
  Roboto_Mono,
  Syncopate,
} from "next/font/google";

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
  preload: false,
});

const roboto = Roboto({
  subsets: ["latin"],
  variable: "--font-roboto",
  weight: ["400", "500", "600", "700", "900"],
  display: "swap",
});

const comfortaa = Comfortaa({
  subsets: ["latin"],
  variable: "--font-comfortaa",
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

const daysOne = Days_One({
  subsets: ["latin"],
  variable: "--font-days-one",
  weight: "400",
  display: "swap",
  preload: false,
});

const deliusUnicase = Delius_Unicase({
  subsets: ["latin"],
  variable: "--font-delius-unicase",
  weight: "400",
  display: "swap",
  preload: false,
});

const lato = Lato({
  subsets: ["latin"],
  variable: "--font-lato",
  weight: ["400", "700", "900"],
  display: "swap",
  preload: false,
});

const lobster = Lobster({
  subsets: ["latin"],
  variable: "--font-lobster",
  weight: "400",
  display: "swap",
  preload: false,
});

const pacifico = Pacifico({
  subsets: ["latin"],
  variable: "--font-pacifico",
  weight: "400",
  display: "swap",
  preload: false,
});

const syncopate = Syncopate({
  subsets: ["latin"],
  variable: "--font-syncopate",
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});

const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant-garamond",
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  variable: "--font-bebas-neue",
  weight: "400",
  display: "swap",
  preload: false,
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
        roboto.variable,
        comfortaa.variable,
        daysOne.variable,
        deliusUnicase.variable,
        lato.variable,
        lobster.variable,
        pacifico.variable,
        syncopate.variable,
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

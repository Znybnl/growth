import type { Metadata } from "next";
import { CookiePreferences } from "@/components/privacy/cookie-preferences";
import { Inter, Roboto_Mono } from "next/font/google";

import { cn } from "@/lib/utils";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-navigation";
import { SITE_URL, pageMetadata, safeJsonLd, siteEntities } from "@/lib/site";
import "./globals.css";

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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  ...pageMetadata(
    "/",
    "Jeux par QR code pour commerces : roue et ticket à gratter | Okado",
    "Créez un jeu mobile avec votre logo, vos lots et votre affiche QR. Suivez les participations, gains et retraits. Essai de 30 jours sans carte.",
  ),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={cn("h-full font-sans", inter.variable, robotoMono.variable)}
    >
      <body className="min-h-full">
        <SiteHeader />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(siteEntities) }}
        />
        {children}
        <SiteFooter />
        <CookiePreferences />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Manrope, Syne } from "next/font/google";

import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Retail Activation MVP",
  description:
    "MVP de plateforme d'activation client en magasin inspiré des meilleurs outils CRM locaux.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${manrope.variable} ${syne.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}

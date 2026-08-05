import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Inter, Roboto_Mono } from "next/font/google";

import { cn } from "@/lib/utils";
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
  title: "Okado | Digitalisez le trafic de votre point de vente",
  description:
    "Transformez vos visiteurs physiques anonymes en prospects qualifiés grâce à des jeux concours par QR Code.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={cn("h-full font-sans", inter.variable, robotoMono.variable)}>
      <body className="min-h-full">
        {children}
        <Analytics />
      </body>
    </html>
  );
}

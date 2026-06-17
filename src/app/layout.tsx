import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";

import { APP_DESCRIPTION, APP_NAME_CAPITALIZED } from "@/lib/branding";
import "./globals.css";

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
    <html lang="fr" className="h-full">
      <body className="min-h-full">
        {children}
        <Analytics />
      </body>
    </html>
  );
}

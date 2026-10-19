"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { captureMarketingEvent } from "@/lib/marketing-analytics";

export function PrimaryButton({
  children,
  href,
  trackingName,
  trackingLocation,
  trackingVariant,
  appearance = "primary",
}: {
  children: ReactNode;
  href: string;
  trackingName?: string;
  trackingLocation?: string;
  trackingVariant?: string;
  appearance?: "primary" | "secondary" | "text";
}) {
  return (
    <Link
      href={href}
      onClick={() => {
        if (trackingName) {
          captureMarketingEvent("marketing_cta_clicked", {
            cta: trackingName,
            location: trackingLocation,
            variant: trackingVariant,
            destination: new URL(href, window.location.href).pathname,
          });
        }
      }}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] text-[15px] font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6c00f6] ${appearance === "primary" ? "bg-[#6c00f6] px-5 py-3 text-white shadow-[0_6px_18px_rgba(108,0,246,0.12)] hover:bg-[#5700ce]" : appearance === "secondary" ? "border border-[#e0d5e7] bg-white px-5 py-3 text-[#513049] hover:bg-[#f6f0fa]" : "mt-5 justify-start py-2 text-sm text-[#6c00f6] underline underline-offset-4"}`}
    >
      {children}
      <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
    </Link>
  );
}

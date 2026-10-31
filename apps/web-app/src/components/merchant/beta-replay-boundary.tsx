"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { startBetaReplayBoundary } from "@/lib/beta-replay-client";

export function BetaReplayBoundary({ subject }: { subject: string }) {
  const pathname = usePathname();
  // Subject is an effect dependency only; eligibility always comes from the authenticated API.
  useEffect(() => startBetaReplayBoundary(), [subject, pathname]);
  return null;
}

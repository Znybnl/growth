"use client";

import { useSyncExternalStore } from "react";
import type { AdminLastSignIn } from "@/lib/admin-last-sign-in";

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function AdminLastSignInCell({ value }: { value: AdminLastSignIn }) {
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady);
  if (value.status !== "available") {
    return <span className="text-xs">{value.status === "never" ? "Jamais connecté" : "Indisponible"}</span>;
  }
  // Deterministic SSR, then the browser timezone without hydration mismatch.
  const timeZone = ready ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
  const date = new Date(value.at);
  return <time dateTime={value.at} title={`Fuseau horaire : ${timeZone}`} className="block text-xs leading-5">
    <span className="block whitespace-nowrap">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone }).format(date)}</span>
    <span className="block whitespace-nowrap">{new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZoneName: "short", timeZone }).format(date)}</span>
  </time>;
}

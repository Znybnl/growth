"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
function getCountry(): "FR" | "CA" {
  const params = new URLSearchParams(window.location.search);
  const locale = navigator.language.toLowerCase();
  const timezone = Intl.DateTimeFormat()
    .resolvedOptions()
    .timeZone.toLowerCase();
  return params.get("country")?.toUpperCase() === "CA" ||
    locale.includes("-ca") ||
    timezone.includes("canada") ||
    timezone.includes("toronto")
    ? "CA"
    : "FR";
}

export function LocalizedPrice() {
  const country = useSyncExternalStore(
    subscribe,
    getCountry,
    () => "FR" as const,
  );
  return (
    <>
      <div className="mt-4 flex items-end gap-2">
        <span className="text-6xl font-bold tracking-[-0.06em] text-[#0f172b]">
          {country === "CA" ? "29 $" : "20 €"}
        </span>
        <span className="pb-2 text-sm font-medium text-[#475569]">
          {country === "CA" ? "CAD / mois" : "HT / mois"}
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-[#475569]">
        {country === "CA"
          ? "Prix affiché pour le Canada. Taxes calculées au moment de la facturation."
          : "Soit 24,00 € TTC en France avec TVA à 20 %. Sans engagement."}
      </p>
    </>
  );
}

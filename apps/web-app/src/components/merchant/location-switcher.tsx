"use client";

import { ChevronDown, MapPin } from "lucide-react";
import { useState } from "react";

import { MerchantLocationAccess } from "@/lib/types";

export function LocationSwitcher({
  locations,
  activeLocationId,
}: {
  locations: MerchantLocationAccess[];
  activeLocationId: string;
}) {
  const [isChanging, setIsChanging] = useState(false);

  if (locations.length <= 1) {
    const location = locations[0]?.merchant;
    return location ? (
      <div className="flex items-center gap-2 rounded-[12px] border border-border bg-white px-3 py-2 text-xs text-ash">
        <MapPin className="h-3.5 w-3.5 text-primary-action-accent" />
        <span className="max-w-[180px] truncate">{location.companyName}{location.city ? ` · ${location.city}` : ""}</span>
      </div>
    ) : null;
  }

  async function changeLocation(locationId: string) {
    if (!locationId || locationId === activeLocationId) return;
    setIsChanging(true);
    try {
      const response = await fetch("/api/merchant/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId }),
      });
      if (!response.ok) throw new Error("Sélection du site impossible.");
      window.location.reload();
    } catch {
      setIsChanging(false);
    }
  }

  return (
    <label className="relative flex min-w-0 items-center gap-2 rounded-[12px] border border-border bg-white px-3 py-2 text-xs text-graphite shadow-[var(--shadow-product-card)]">
      <MapPin className="h-3.5 w-3.5 shrink-0 text-primary-action-accent" />
      <span className="sr-only">Site actif</span>
      <select
        value={activeLocationId}
        disabled={isChanging}
        onChange={(event) => void changeLocation(event.target.value)}
        className="min-w-0 max-w-[190px] appearance-none bg-transparent pr-5 text-xs font-semibold outline-none"
      >
        {locations.map(({ merchant }) => (
          <option key={merchant.id} value={merchant.id}>
            {merchant.companyName}{merchant.city ? ` · ${merchant.city}` : ""}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-ash" />
    </label>
  );
}

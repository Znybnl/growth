"use client";

import { ChevronDown, MapPin } from "lucide-react";
import { useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

  const activeLocation = locations.find(({ merchant }) => merchant.id === activeLocationId)?.merchant;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isChanging}
        className="inline-flex min-w-0 max-w-[260px] items-center gap-2 rounded-[12px] border border-border bg-white px-3 py-2 text-xs text-graphite shadow-[var(--shadow-product-card)] outline-none transition hover:bg-linen-canvas focus-visible:ring-2 focus-visible:ring-primary-action-accent/30 disabled:cursor-wait disabled:opacity-60"
      >
        <MapPin className="h-3.5 w-3.5 shrink-0 text-primary-action-accent" />
        <span className="sr-only">Site actif</span>
        <span className="min-w-0 truncate text-left font-semibold">
          {activeLocation?.companyName ?? "Choisir un site"}
          {activeLocation?.city ? ` · ${activeLocation.city}` : ""}
        </span>
        <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-ash" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[240px] p-1.5">
        <DropdownMenuLabel>Changer de site</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={activeLocationId}
          onValueChange={(locationId) => void changeLocation(locationId)}
        >
          {locations.map(({ merchant }) => (
            <DropdownMenuRadioItem key={merchant.id} value={merchant.id} className="py-2">
              <span className="min-w-0 truncate">
                {merchant.companyName}
                {merchant.city ? ` · ${merchant.city}` : ""}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

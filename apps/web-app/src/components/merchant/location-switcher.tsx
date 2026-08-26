"use client";

import { ChevronDown, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

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
  const router = useRouter();
  const [isChanging, setIsChanging] = useState(false);
  const [isRefreshing, startTransition] = useTransition();

  async function changeLocation(locationId: string) {
    if (!locationId || locationId === activeLocationId) return;
    setIsChanging(true);
    window.dispatchEvent(new CustomEvent("merchant-location-changing", { detail: { locationId } }));
    try {
      const response = await fetch("/api/merchant/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId }),
      });
      if (!response.ok) throw new Error("Sélection du site impossible.");
      startTransition(() => router.refresh());
    } catch {
      setIsChanging(false);
      window.dispatchEvent(new CustomEvent("merchant-location-change-error"));
    }
  }

  const activeLocation = locations.find(({ merchant }) => merchant.id === activeLocationId)?.merchant;

  if (!activeLocation) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isChanging || isRefreshing || locations.length <= 1}
        className="inline-flex min-h-10 min-w-0 max-w-[260px] !cursor-default select-none items-center gap-2 rounded-[var(--okado-radius-control)] border border-border bg-white px-3 text-xs text-graphite shadow-[var(--shadow-product-card)] outline-none transition hover:bg-linen-canvas focus-visible:ring-2 focus-visible:ring-primary-action-accent/30 disabled:cursor-default disabled:opacity-100"
      >
        <MapPin className="okado-icon-sm shrink-0 text-primary-action-accent" />
        <span className="sr-only">Site actif</span>
        <span className="min-w-0 truncate text-left font-semibold">
          {activeLocation?.companyName ?? "Choisir un site"}
          {activeLocation?.city ? ` · ${activeLocation.city}` : ""}
        </span>
        {locations.length > 1 ? (
          <ChevronDown className="okado-icon-sm ml-auto shrink-0 text-ash" aria-hidden="true" />
        ) : null}
      </DropdownMenuTrigger>
      {locations.length > 1 ? <DropdownMenuContent align="end" className="min-w-[240px] rounded-[var(--okado-radius-control)] border-border p-1.5 shadow-[var(--shadow-product-card)]">
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
        </DropdownMenuContent> : null}
    </DropdownMenu>
  );
}

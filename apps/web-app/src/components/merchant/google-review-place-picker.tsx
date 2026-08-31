"use client";

import { useEffect, useMemo, useState } from "react";

export type GoogleReviewPlace = {
  placeId: string;
  name: string;
  address: string;
  phone: string;
  rating?: number | null;
  reviewCount?: number | null;
  reviewUrl: string;
};

export type GoogleReviewPlaceSummary = Pick<GoogleReviewPlace, "name" | "address" | "rating" | "reviewCount">;

type GoogleReviewPlacePickerProps = {
  value: string;
  onChange: (value: string) => void;
  defaultQuery?: string;
  city?: string;
  compact?: boolean;
  allowManualInput?: boolean;
  onAddressChange?: (value: string) => void;
  onPhoneChange?: (value: string) => void;
  selectedPlace?: GoogleReviewPlaceSummary | null;
  onPlaceChange?: (place: GoogleReviewPlace) => void;
  className?: string;
};

function isGoogleGeneratedReviewUrl(value: string) {
  return value.includes("search.google.com/local/writereview") && value.includes("placeid=");
}

function formatReviewCount(value?: number | null) {
  return typeof value === "number" ? new Intl.NumberFormat("fr-FR").format(value) : null;
}

export function GoogleReviewPlacePicker({
  value,
  onChange,
  defaultQuery = "",
  city = "",
  compact = false,
  allowManualInput = true,
  onAddressChange,
  onPhoneChange,
  selectedPlace = null,
  onPlaceChange,
  className,
}: GoogleReviewPlacePickerProps) {
  const [query, setQuery] = useState(() => selectedPlace?.name ?? defaultQuery);
  const [places, setPlaces] = useState<GoogleReviewPlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [hasUserEditedQuery, setHasUserEditedQuery] = useState(false);
  const [manualMode, setManualMode] = useState(
    allowManualInput && Boolean(value) && !isGoogleGeneratedReviewUrl(value),
  );

  const selectedPlaceId = useMemo(() => {
    try {
      return new URL(value).searchParams.get("placeid") ?? "";
    } catch {
      return "";
    }
  }, [value]);

  const hasSelectedPlace = Boolean(selectedPlaceId || selectedPlace);

  useEffect(() => {
    if (manualMode || (hasSelectedPlace && !hasUserEditedQuery)) return;

    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 3) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);
      setMessage(null);

      try {
        const params = new URLSearchParams({ q: trimmedQuery });
        if (city.trim()) params.set("city", city.trim());
        const response = await fetch(`/api/google-places/search?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as {
          configured?: boolean;
          places?: GoogleReviewPlace[];
          error?: string;
        };

        if (!response.ok && response.status !== 503) {
          throw new Error(payload.error ?? "Recherche Google impossible.");
        }

        setPlaces(payload.places ?? []);

        if (payload.configured === false) {
          if (allowManualInput) {
            setManualMode(true);
          }
          setMessage(
            allowManualInput
              ? "Recherche Google non configurée. Collez votre lien d'avis manuellement."
              : "Recherche Google non configurée. Renseignez un lien personnalisé dans le champ dédié.",
          );
        } else if (!(payload.places ?? []).length) {
          setMessage("Aucun établissement trouvé. Essayez avec le nom exact ou ajoutez la ville.");
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setPlaces([]);
        setMessage(error instanceof Error ? error.message : "Recherche Google impossible.");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [allowManualInput, city, hasSelectedPlace, hasUserEditedQuery, manualMode, query, selectedPlaceId]);

  return (
    <div className={[compact ? "space-y-3" : "space-y-4", className].filter(Boolean).join(" ")}>
      <div className={`rounded-[24px] border border-[#d7e0ed] p-3 ${compact ? "bg-white" : "bg-[#f7f9fc]"}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-white text-lg font-bold text-[#2f6df6] shadow-[0_10px_26px_rgba(122,136,166,0.16)]">
            G
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-sm text-[#616b7c]">Fiche Google</span>
              {hasSelectedPlace && !hasUserEditedQuery ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f7ef] px-2 py-1 text-[11px] font-semibold text-[#18794e]">
                  <span aria-hidden="true">✓</span>
                  Sélectionnée
                </span>
              ) : null}
            </div>
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setHasUserEditedQuery(true);
                setManualMode(false);
                setQuery(event.target.value);
                if (event.target.value.trim().length < 3) {
                  setPlaces([]);
                  setMessage(null);
                }
              }}
              placeholder="Rechercher votre établissement sur Google"
              className="w-full rounded-[18px] border border-[#d7e0ed] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#2f6df6] focus:ring-4 focus:ring-[#2f6df6]/10"
            />
          </div>
        </div>

        {hasSelectedPlace && !hasUserEditedQuery && !isLoading ? (
          <div className="mt-3 flex items-start gap-3 border-t border-[#e8edf4] px-1 pt-3">
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#edf9f1] text-sm font-bold text-[#18794e]" aria-hidden="true">✓</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#172033]">{selectedPlace?.name ?? query}</p>
              {selectedPlace?.address ? <p className="mt-0.5 text-xs leading-5 text-[#667085]">{selectedPlace.address}</p> : null}
              {selectedPlace && (selectedPlace.rating != null || selectedPlace.reviewCount != null) ? (
                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs font-medium text-[#667085]">
                  {selectedPlace.rating != null ? <span className="text-[#b7791f]">★ {selectedPlace.rating.toFixed(1)}</span> : null}
                  {selectedPlace.reviewCount != null ? <span>{formatReviewCount(selectedPlace.reviewCount)} avis Google</span> : null}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {!manualMode && (isLoading || places.length > 0 || message) ? (
          <div className="mt-3 space-y-2">
            {isLoading ? (
              <p className="rounded-[18px] bg-white px-4 py-3 text-sm text-[#5c6577]">
                Recherche de votre établissement...
              </p>
            ) : null}
            {places.map((place) => (
              <button
                key={place.placeId}
                type="button"
                  onClick={() => {
                    setHasUserEditedQuery(false);
                    onChange(place.reviewUrl);
                    onPlaceChange?.(place);
                    onAddressChange?.(place.address);
                    onPhoneChange?.(place.phone);
                    setQuery(place.name);
                    setPlaces([]);
                    setMessage(null);
                }}
                className={`w-full rounded-[18px] border px-4 py-3 text-left transition hover:border-[#2f6df6] hover:bg-white ${
                  selectedPlaceId === place.placeId
                    ? "border-[#2f6df6] bg-white shadow-[0_12px_30px_rgba(47,109,246,0.12)]"
                    : "border-[#e1e7f0] bg-white/70"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="block text-sm font-semibold text-[#111827]">{place.name}</span>
                  {place.rating != null || place.reviewCount != null ? (
                    <span className="shrink-0 text-xs font-medium text-[#667085]">
                      {place.rating != null ? `★ ${place.rating.toFixed(1)}` : ""}
                      {place.reviewCount != null ? ` · ${formatReviewCount(place.reviewCount)} avis` : ""}
                    </span>
                  ) : null}
                </div>
                {place.address ? (
                  <span className="mt-1 block text-xs leading-5 text-[#667085]">{place.address}</span>
                ) : null}
              </button>
            ))}
            {message && !isLoading ? <p className="px-1 text-xs text-[#667085]">{message}</p> : null}
          </div>
        ) : null}
      </div>

    </div>
  );
}

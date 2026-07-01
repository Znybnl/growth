"use client";

import { useEffect, useMemo, useState } from "react";

type GoogleReviewPlace = {
  placeId: string;
  name: string;
  address: string;
  reviewUrl: string;
};

type GoogleReviewPlacePickerProps = {
  value: string;
  onChange: (value: string) => void;
  defaultQuery?: string;
  city?: string;
  compact?: boolean;
};

function isGoogleGeneratedReviewUrl(value: string) {
  return value.includes("search.google.com/local/writereview") && value.includes("placeid=");
}

export function GoogleReviewPlacePicker({
  value,
  onChange,
  defaultQuery = "",
  city = "",
  compact = false,
}: GoogleReviewPlacePickerProps) {
  const [query, setQuery] = useState(defaultQuery);
  const [places, setPlaces] = useState<GoogleReviewPlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);

  const selectedPlaceId = useMemo(() => {
    try {
      return new URL(value).searchParams.get("placeid") ?? "";
    } catch {
      return "";
    }
  }, [value]);

  useEffect(() => {
    if (manualMode) return;

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
          setMessage("Recherche Google non configurée. Vérifiez la configuration Google Places.");
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
  }, [city, manualMode, query]);

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="rounded-[24px] border border-[#d7e0ed] bg-[#f7f9fc] p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-white text-lg font-bold text-[#2f6df6] shadow-[0_10px_26px_rgba(122,136,166,0.16)]">
            G
          </div>
          <div className="min-w-0 flex-1">
            <span className="mb-2 block text-sm text-[#616b7c]">Établissement Google</span>
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setManualMode(false);
                setQuery(event.target.value);
                if (event.target.value.trim().length < 3) {
                  setPlaces([]);
                  setMessage(null);
                }
              }}
              placeholder="Rechercher votre restaurant sur Google"
              className="w-full rounded-[18px] border border-[#d7e0ed] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#2f6df6] focus:ring-4 focus:ring-[#2f6df6]/10"
            />
          </div>
        </div>

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
                  onChange(place.reviewUrl);
                  setQuery(`${place.name}${place.address ? ` · ${place.address}` : ""}`);
                  setPlaces([]);
                  setMessage("Lien d'avis Google généré automatiquement.");
                }}
                className={`w-full rounded-[18px] border px-4 py-3 text-left transition hover:border-[#2f6df6] hover:bg-white ${
                  selectedPlaceId === place.placeId
                    ? "border-[#2f6df6] bg-white shadow-[0_12px_30px_rgba(47,109,246,0.12)]"
                    : "border-[#e1e7f0] bg-white/70"
                }`}
              >
                <span className="block text-sm font-semibold text-[#111827]">{place.name}</span>
                {place.address ? (
                  <span className="mt-1 block text-xs leading-5 text-[#667085]">{place.address}</span>
                ) : null}
              </button>
            ))}
            {message && !isLoading ? <p className="px-1 text-xs text-[#667085]">{message}</p> : null}
          </div>
        ) : null}
      </div>

      {value && isGoogleGeneratedReviewUrl(value) ? (
        <div className="rounded-[18px] border border-[#cce7d5] bg-[#effaf3] px-4 py-3 text-sm text-[#1f7d53]">
          Lien d&apos;avis Google généré automatiquement.
        </div>
      ) : null}
    </div>
  );
}

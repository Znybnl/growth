import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth";

type GooglePlaceSearchResponse = {
  places?: Array<{
    id?: string;
    displayName?: {
      text?: string;
    };
    formattedAddress?: string;
  }>;
};

const GOOGLE_REVIEW_URL_BASE = "https://search.google.com/local/writereview";

function buildReviewUrl(placeId: string) {
  const url = new URL(GOOGLE_REVIEW_URL_BASE);
  url.searchParams.set("placeid", placeId);
  return url.toString();
}

export async function GET(request: Request) {
  const session = await getAuthenticatedSession();

  if (!session) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      configured: false,
      places: [],
      error: "Recherche Google non configurée.",
    });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const city = searchParams.get("city")?.trim() ?? "";

  if (query.length < 3) {
    return NextResponse.json({ configured: true, places: [] });
  }

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress",
    },
    body: JSON.stringify({
      textQuery: [query, city].filter(Boolean).join(" "),
      languageCode: "fr",
      regionCode: "FR",
      pageSize: 5,
    }),
  });

  if (!response.ok) {
    return NextResponse.json(
      {
        configured: true,
        places: [],
        error: "Recherche Google momentanément indisponible.",
      },
      { status: response.status },
    );
  }

  const payload = (await response.json()) as GooglePlaceSearchResponse;
  const places = (payload.places ?? [])
    .filter((place) => place.id)
    .map((place) => ({
      placeId: place.id,
      name: place.displayName?.text ?? "Établissement Google",
      address: place.formattedAddress ?? "",
      reviewUrl: buildReviewUrl(place.id ?? ""),
    }));

  return NextResponse.json({ configured: true, places });
}

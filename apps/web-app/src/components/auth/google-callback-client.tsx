"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

function buildAuthErrorUrl(message: string) {
  const url = new URL("/connexion", window.location.origin);
  url.searchParams.set("error", "google_oauth");
  url.searchParams.set("reason", message);
  return url.toString();
}

export function GoogleCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Connexion Google en cours...");

  useEffect(() => {
    let cancelled = false;

    async function completeGoogleLogin() {
      const code = searchParams.get("code");
      const next = searchParams.get("next") || "/";
      const providerError = searchParams.get("error");
      const providerErrorDescription = searchParams.get("error_description");

      if (providerError || !code) {
        router.replace(
          buildAuthErrorUrl(
            providerErrorDescription || providerError || "Code de retour Google introuvable.",
          ),
        );
        return;
      }

      try {
        if (!cancelled) {
          setMessage("Finalisation de votre espace marchand...");
        }

        const response = await fetch("/api/auth/google/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            referralCode: searchParams.get("ref") || undefined,
          }),
        });

        const payload = (await response.json()) as {
          error?: string;
          redirectPath?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Connexion Google impossible.");
        }

        window.location.replace(payload.redirectPath || next);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : searchParams.get("error_description") ||
              "Échec de finalisation de la session Google ou de création du compte marchand.";
        router.replace(buildAuthErrorUrl(message));
      }
    }

    void completeGoogleLogin();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-soft-white px-6">
      <div className="w-full max-w-[520px] rounded-[32px] border border-lavender-mist bg-white p-10 text-center shadow-product-card backdrop-blur">
        <p className="text-xs uppercase tracking-[0.32em] text-ash">Google Auth</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-carbon">
          Connexion en cours
        </h1>
        <p className="mt-4 text-base leading-7 text-charcoal">{message}</p>
      </div>
    </main>
  );
}

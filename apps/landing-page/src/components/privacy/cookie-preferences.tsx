"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { ANALYTICS_CONSENT_EVENT, readAnalyticsConsent } from "@/lib/analytics-consent";
import { isAnalyticsConfigured, setAnalyticsChoice } from "@/lib/consent-managed-analytics";
import { isPublicGamePage } from "@/lib/cookie-preferences-visibility";
import type { AnalyticsChoice } from "@/lib/analytics-consent";

const PreferencesContext = createContext<{
  visible: boolean;
  open: (button: HTMLButtonElement) => void;
} | null>(null);

/** Uses the single root consent panel, including inside the workspace header. */
export function CookiePreferencesButton({ className }: { className?: string }) {
  const preferences = useContext(PreferencesContext);
  if (!isAnalyticsConfigured || !preferences) return null;
  return (
    <button type="button" onClick={(event) => preferences.open(event.currentTarget)}
      className={className} aria-expanded={preferences.visible} aria-controls="okado-cookie-preferences">
      Gérer les cookies
    </button>
  );
}

export function CookiePreferences({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [currentChoice, setCurrentChoice] = useState<AnalyticsChoice | null>(null);
  const [error, setError] = useState(false);
  const launcherRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    function refresh() {
      const consent = readAnalyticsConsent();
      setCurrentChoice(consent?.choice ?? null);
      setVisible(!consent);
    }
    refresh();
    window.addEventListener(ANALYTICS_CONSENT_EVENT, refresh);
    return () => window.removeEventListener(ANALYTICS_CONSENT_EVENT, refresh);
  }, []);

  useEffect(() => {
    if (visible && launcherRef.current) document.getElementById("okado-cookie-title")?.focus();
  }, [visible]);

  if (!isAnalyticsConfigured) return children ?? null;

  const isGamePage = isPublicGamePage(pathname);

  function closePreferences() {
    setVisible(false);
    launcherRef.current?.focus();
    launcherRef.current = null;
  }

  function choose(choice: AnalyticsChoice) {
    if (!setAnalyticsChoice(choice)) {
      setError(true);
      return;
    }
    setError(false);
    closePreferences();
  }

  const buttonStyle = "min-h-11 flex-1 rounded-lg border border-[#6c00f6] bg-white px-4 py-2 text-sm font-semibold text-[#6c00f6] hover:bg-[#f5f0ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6c00f6]";
  return (
    <PreferencesContext.Provider value={{ visible, open: (button) => {
      launcherRef.current = button;
      setVisible(true);
    } }}>
      {children}
      {currentChoice === "accepted" && <Analytics beforeSend={(event) => {
        if (readAnalyticsConsent()?.choice !== "accepted") return null;
        const url = new URL(event.url);
        // No query, fragment or dynamic game/redemption identifier in metrics.
        const section = url.pathname.split("/")[1];
        const path = ["campaign", "redeem", "api", "auth"].includes(section) ? "/" + section : url.pathname;
        return { ...event, url: url.origin + path };
      }} />}
      {!isGamePage && (
        <CookiePreferencesButton
          className="okado-cookie-floating-trigger fixed bottom-2 left-2 z-[90] rounded-lg border border-[#dbe3ef] bg-white px-3 py-2 text-xs text-[#0f172b] shadow-sm focus-visible:outline-2 focus-visible:outline-[#6c00f6]" />
      )}
      {visible && (
        <section id="okado-cookie-preferences" aria-labelledby="okado-cookie-title"
          className="fixed inset-x-3 bottom-14 z-[100] mx-auto max-h-[75dvh] max-w-xl overflow-y-auto rounded-2xl border border-[#dbe3ef] bg-white p-5 text-[#0f172b] shadow-xl sm:inset-x-auto sm:left-4 sm:right-4 sm:mx-0">
          <h2 id="okado-cookie-title" tabIndex={-1} className="text-lg font-bold">Votre choix de mesure d’audience</h2>
          <p className="mt-3 text-sm leading-6">
            Avec votre accord, PostHog mesure vos visites et le parcours jusqu’à la publication d’un jeu ; Vercel Analytics mesure la fréquentation.
            Si vous êtes connecté, votre e-mail de connexion identifie votre profil PostHog et relie ces mesures à votre compte marchand.
            Votre choix s’applique au site Okado et à son application (okado.app, www.okado.app et app.okado.app).
          </p>
          <p className="mt-2 text-sm leading-6">
            Vous pouvez refuser et continuer à utiliser le service, puis changer d’avis ici à tout moment.
            Votre choix est mémorisé pendant 6 mois.
            {" "}<a href="https://www.okado.app/confidentialite" className="underline">Confidentialité</a>
          </p>
          {currentChoice && <p className="mt-2 text-sm">Choix actuel : {currentChoice === "accepted" ? "accepté" : "refusé"}.</p>}
          {error && <p role="alert" className="mt-2 text-sm">Votre navigateur ne permet pas d’enregistrer ce choix. La mesure reste désactivée sans accord enregistré.</p>}
          <div className="mt-4 flex gap-3">
            <button type="button" className={buttonStyle} onClick={() => choose("rejected")}>Refuser</button>
            <button type="button" className={buttonStyle} onClick={() => choose("accepted")}>Accepter</button>
          </div>
          <button type="button" onClick={closePreferences} className="mt-3 min-h-10 text-sm underline">
            Continuer sans modifier mon choix
          </button>
        </section>
      )}
    </PreferencesContext.Provider>
  );
}

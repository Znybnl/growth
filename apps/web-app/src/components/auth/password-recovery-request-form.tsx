"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { captureClientProductEvent } from "@/lib/client-product-analytics";

const EMAIL_PREFILL_KEY = "okado:password-recovery-email";

export function PasswordRecoveryRequestForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [screen, setScreen] = useState<"form" | "sent" | "limited">("form");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: number | undefined;
    try {
      const savedEmail = sessionStorage.getItem(EMAIL_PREFILL_KEY);
      if (savedEmail) {
        timer = window.setTimeout(() => {
          if (sessionStorage.getItem(EMAIL_PREFILL_KEY) === savedEmail) {
            sessionStorage.removeItem(EMAIL_PREFILL_KEY);
          }
          setEmail(savedEmail);
        }, 0);
      }
    } catch {
      // The address can always be entered manually.
    }
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function requestLink() {
    if (isLoading || cooldown > 0) return;
    setError(null);
    setIsLoading(true);
    captureClientProductEvent("password_reset_requested");

    try {
      const response = await fetch("/api/auth/recovery/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("Retry-After"));
        setCooldown(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 900) : 60);
        setScreen("limited");
        return;
      }
      if (!response.ok) {
        setError("Nous n’avons pas pu traiter la demande. Vérifiez votre connexion et réessayez.");
        return;
      }

      setCooldown(60);
      setScreen("sent");
    } catch {
      setError("Une erreur est survenue. Vérifiez votre connexion et réessayez.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void requestLink();
  }

  if (screen !== "form") {
    const limited = screen === "limited";
    return (
      <section aria-live="polite" className="flex flex-col py-4">
        <h1 className="okado-page-title">
          {limited ? "Veuillez patienter" : "Vérifiez votre boîte e-mail"}
        </h1>
        <p className="mt-3 text-base leading-7 text-[#554b59]">
          {limited
            ? "Vous avez récemment demandé un lien. Réessayez dans quelques instants."
            : "Si un compte Okado est associé à cette adresse, un lien de réinitialisation va être envoyé. Pensez à vérifier vos courriers indésirables."}
        </p>
        {cooldown > 0 ? (
          <p className="mt-4 text-sm text-[#66596b]" role="status">
            Vous pourrez demander un nouveau lien dans {cooldown} s.
          </p>
        ) : null}
        <div className="mt-7 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => void requestLink()}
            disabled={isLoading || cooldown > 0}
            className="okado-filled-action okado-auth-action w-full text-base disabled:opacity-60"
          >
            {isLoading ? "Envoi…" : "Renvoyer le lien"}
          </button>
          <button
            type="button"
            onClick={() => {
              setScreen("form");
              setError(null);
            }}
            className="okado-primary-action okado-auth-action w-full text-base"
          >
            Modifier mon adresse e-mail
          </button>
          <Link href="/connexion" className="okado-link min-h-10 self-center px-2 py-2 text-sm font-medium">
            Retour à la connexion
          </Link>
        </div>
      </section>
    );
  }

  return (
    <form className="flex flex-col py-4" onSubmit={handleSubmit}>
      <div>
        <h1 className="okado-page-title">Mot de passe oublié ?</h1>
        <p className="mt-3 text-base leading-7 text-[#554b59]">
          Renseignez l’adresse e-mail associée à votre compte Okado pour recevoir un lien de réinitialisation.
        </p>
      </div>

      <label className="mt-7 block text-sm">
        <span className="mb-1 block font-medium text-[#423748]">Adresse e-mail</span>
        <input
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="vous@exemple.fr"
          className="h-[50px] w-full rounded-[12px] border border-[#cbc5cf] bg-white px-4 text-base text-carbon outline-none transition placeholder:text-[#76707d] focus:border-aubergine focus:shadow-[0_0_0_3px_rgba(97,31,105,0.16)]"
          required
        />
      </label>

      {error ? (
        <p className="mt-4 rounded-[8px] border border-coral-alert/30 bg-coral-alert/10 px-4 py-3 text-sm text-coral-alert" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        className="okado-filled-action okado-auth-action mt-7 w-full text-base disabled:opacity-60"
      >
        {isLoading ? "Envoi du lien…" : "Envoyer le lien de réinitialisation"}
      </button>
      <p className="mt-5 text-center text-sm leading-6 text-[#66596b]">
        Vous utilisez Google pour vous connecter à Okado ? Vous pouvez continuer avec votre compte Google.
      </p>
      <Link href="/connexion" className="okado-link mt-3 min-h-10 self-center px-2 py-2 text-sm font-medium">
        Retour à la connexion
      </Link>
    </form>
  );
}

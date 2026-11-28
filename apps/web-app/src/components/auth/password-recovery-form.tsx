"use client";

import Link from "next/link";
import { useLayoutEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { resetProductAnalytics } from "@/lib/client-product-analytics";

declare global {
  interface Window {
    __okadoRecoveryFragment?: string;
  }
}

type RecoveryScreen = "reading" | "ready" | "invalid" | "success";

export function PasswordRecoveryForm() {
  const [screen, setScreen] = useState<RecoveryScreen>("reading");
  const [tokenHash, setTokenHash] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionsRevoked, setSessionsRevoked] = useState(true);

  useLayoutEffect(() => {
    const recoveryFragment = window.__okadoRecoveryFragment ?? window.location.hash;
    const params = new URLSearchParams(recoveryFragment.replace(/^#/, ""));
    const token = params.get("token_hash");
    const type = params.get("type");

    // Keep the one-time credential in memory only; never leave it in browser
    // history, a referrer, or a subsequent navigation.
    if (window.location.hash) {
      window.history.replaceState(window.history.state, "", window.location.pathname);
    }

    const nextScreen = type === "recovery" && token && token.length <= 512 ? "ready" : "invalid";
    const timer = window.setTimeout(() => {
      if (nextScreen === "ready" && token) setTokenHash(token);
      setScreen(nextScreen);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Les deux mots de passe doivent être identiques.");
      return;
    }
    if (isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/recovery/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(tokenHash ? { token_hash: tokenHash } : {}),
          password,
          confirmPassword,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        recoverySessionReady?: boolean;
        sessionsRevoked?: boolean;
      };

      if (response.ok) {
        delete window.__okadoRecoveryFragment;
        setTokenHash(null);
        setPassword("");
        setConfirmPassword("");
        setSessionsRevoked(payload.sessionsRevoked !== false);
        setScreen("success");
        resetProductAnalytics();
        return;
      }

      if (payload.recoverySessionReady) {
        delete window.__okadoRecoveryFragment;
        setTokenHash(null);
      }
      if (payload.error === "invalid_link" || payload.error === "recovery_required") {
        delete window.__okadoRecoveryFragment;
        setTokenHash(null);
        setScreen("invalid");
      } else if (payload.error === "password_mismatch") {
        setError("Les deux mots de passe doivent être identiques.");
      } else if (payload.error === "password_rejected") {
        setError("Ce mot de passe ne respecte pas les exigences de sécurité du compte. Essayez-en un autre.");
      } else if (payload.error === "rate_limited") {
        setError("Trop de tentatives ont été effectuées. Patientez quelques instants puis réessayez.");
      } else {
        setError("Nous n’avons pas pu modifier votre mot de passe. Vérifiez votre connexion et réessayez.");
      }
    } catch {
      setError("Une erreur est survenue. Vérifiez votre connexion et réessayez.");
    } finally {
      setIsLoading(false);
    }
  }

  if (screen === "reading") {
    return (
      <section aria-live="polite" className="py-4">
        <h1 className="okado-page-title">Préparation du lien</h1>
        <p className="mt-3 text-base leading-7 text-[#554b59]">Ouverture de la page sécurisée…</p>
      </section>
    );
  }

  if (screen === "invalid") {
    return (
      <section aria-live="polite" className="py-4">
        <h1 className="okado-page-title">Ce lien n’est plus valide</h1>
        <p className="mt-3 text-base leading-7 text-[#554b59]">
          Il a peut-être expiré ou déjà été utilisé. Demandez un nouveau lien pour modifier votre mot de passe.
        </p>
        <Link href="/mot-de-passe-oublie" className="okado-filled-action okado-auth-action mt-7 flex w-full items-center justify-center text-base">
          Demander un nouveau lien
        </Link>
        <Link href="/connexion" className="okado-link mt-4 flex min-h-10 items-center justify-center text-sm font-medium">
          Retour à la connexion
        </Link>
      </section>
    );
  }

  if (screen === "success") {
    return (
      <section aria-live="polite" className="py-4">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#edf7ef] text-lg font-semibold text-[#26713b]" aria-hidden="true">
          ✓
        </div>
        <h1 className="okado-page-title">Votre mot de passe a été modifié</h1>
        <p className="mt-3 text-base leading-7 text-[#554b59]">
          Vous pouvez maintenant vous connecter à votre compte Okado avec votre nouveau mot de passe.
        </p>
        {!sessionsRevoked ? (
          <p className="mt-3 rounded-[8px] border border-[#e7d9a6] bg-[#fff9e6] px-4 py-3 text-sm leading-6 text-[#5e4b19]">
            Reconnectez-vous. Certaines sessions sur vos autres appareils peuvent rester actives jusqu’à leur expiration.
          </p>
        ) : null}
        <Link href="/connexion" className="okado-filled-action okado-auth-action mt-7 flex w-full items-center justify-center text-base">
          Me connecter
        </Link>
      </section>
    );
  }

  return (
    <form className="flex flex-col py-4" onSubmit={handleSubmit}>
      <div>
        <h1 className="okado-page-title">Définissez votre nouveau mot de passe</h1>
        <p className="mt-3 text-base leading-7 text-[#554b59]">
          Choisissez un mot de passe unique et long pour sécuriser votre accès à Okado.
        </p>
      </div>

      <div className="mt-7 block text-sm">
        <label htmlFor="password-recovery-new" className="mb-1 block font-medium text-[#423748]">Nouveau mot de passe</label>
        <span className="relative block">
          <input
            id="password-recovery-new"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            maxLength={1024}
            onChange={(event) => setPassword(event.target.value)}
            className="h-[50px] w-full rounded-[12px] border border-[#cbc5cf] bg-white px-4 pr-12 text-base text-carbon outline-none transition focus:border-aubergine focus:shadow-[0_0_0_3px_rgba(97,31,105,0.16)]"
            required
            aria-describedby="password-recovery-guidance"
          />
          <button
            type="button"
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((value) => !value)}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-[12px] text-[#554b59] hover:text-aubergine focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-aubergine"
          >
            {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
          </button>
        </span>
      </div>

      <div className="mt-4 block text-sm">
        <label htmlFor="password-recovery-confirm" className="mb-1 block font-medium text-[#423748]">Confirmer le nouveau mot de passe</label>
        <span className="relative block">
          <input
            id="password-recovery-confirm"
            type={showConfirmation ? "text" : "password"}
            autoComplete="new-password"
            value={confirmPassword}
            maxLength={1024}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="h-[50px] w-full rounded-[12px] border border-[#cbc5cf] bg-white px-4 pr-12 text-base text-carbon outline-none transition focus:border-aubergine focus:shadow-[0_0_0_3px_rgba(97,31,105,0.16)]"
            required
          />
          <button
            type="button"
            aria-label={showConfirmation ? "Masquer la confirmation du mot de passe" : "Afficher la confirmation du mot de passe"}
            aria-pressed={showConfirmation}
            onClick={() => setShowConfirmation((value) => !value)}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-[12px] text-[#554b59] hover:text-aubergine focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-aubergine"
          >
            {showConfirmation ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
          </button>
        </span>
      </div>
      <p id="password-recovery-guidance" className="mt-2 text-xs leading-5 text-[#66596b]">
        Utilisez un mot de passe unique. Les exigences du compte sont vérifiées lors de l’enregistrement.
      </p>

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
        {isLoading ? "Enregistrement…" : "Enregistrer mon nouveau mot de passe"}
      </button>
      <Link href="/connexion" className="okado-link mt-3 min-h-10 self-center px-2 py-2 text-sm font-medium">
        Retour à la connexion
      </Link>
    </form>
  );
}

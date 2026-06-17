"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { GoogleAuthButton } from "@/components/auth/google-auth-button";

export function SignUpForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    companyName: "",
    city: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [accept, setAccept] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function updateField(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!accept) {
        throw new Error("Vous devez accepter les conditions pour continuer.");
      }

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Inscription impossible.");
      }

      router.push("/onboarding");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Inscription impossible.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="mx-auto flex max-w-[620px] flex-col justify-center py-6" onSubmit={handleSubmit}>
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Créer un compte</p>
        <h1 className="mt-3 font-display text-5xl leading-[0.95] text-[#121826]">
          Ouvrez votre espace marchand
        </h1>
        <p className="mt-4 text-sm leading-8 text-[#586174]">
          Commencez par votre boutique, puis finalisez votre onboarding pour créer votre première
          campagne.
        </p>
      </div>

      <div className="mt-8">
        <GoogleAuthButton mode="signup" nextPath="/onboarding" />
      </div>

      <div className="mt-8 flex items-center gap-4">
        <div className="h-px flex-1 bg-[#e7ecf4]" />
        <span className="text-sm text-[#9ca3af]">ou continuez avec le formulaire</span>
        <div className="h-px flex-1 bg-[#e7ecf4]" />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {[
          ["companyName", "Nom de l’enseigne", "Maison Sora"],
          ["city", "Ville / boutique", "Paris Marais"],
          ["firstName", "Prénom", "Camille"],
          ["lastName", "Nom", "Martin"],
          ["email", "E-mail professionnel", "camille@maisonsora.fr"],
          ["phone", "Téléphone", "06 00 00 00 00"],
        ].map(([key, label, placeholder]) => (
          <label key={key} className="text-sm">
            <span className="mb-2 block text-[#616b7c]">{label}</span>
            <input
              type={key === "email" ? "email" : "text"}
              value={form[key as keyof typeof form]}
              onChange={(event) => updateField(key as keyof typeof form, event.target.value)}
              placeholder={placeholder}
              className="w-full rounded-[22px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-4 outline-none"
              required
            />
          </label>
        ))}
        <label className="text-sm">
          <span className="mb-2 block text-[#616b7c]">Mot de passe</span>
          <input
            type="password"
            value={form.password}
            onChange={(event) => updateField("password", event.target.value)}
            placeholder="••••••••••"
            className="w-full rounded-[22px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-4 outline-none"
            required
          />
        </label>
        <label className="text-sm">
          <span className="mb-2 block text-[#616b7c]">Confirmer le mot de passe</span>
          <input
            type="password"
            value={form.confirmPassword}
            onChange={(event) => updateField("confirmPassword", event.target.value)}
            placeholder="••••••••••"
            className="w-full rounded-[22px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-4 outline-none"
            required
          />
        </label>
      </div>

      <div className="mt-6 rounded-[24px] border border-[#dbe4f0] bg-[#fbfcfe] px-4 py-4 text-sm leading-7 text-[#475063]">
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1" checked={accept} onChange={(event) => setAccept(event.target.checked)} />
          <span>
            J’accepte les conditions d’utilisation et je souhaite recevoir les conseils de mise en
            route de la plateforme.
          </span>
        </label>
      </div>

      {error ? (
        <div className="mt-4 rounded-[20px] border border-[#f6c4bb] bg-[#fff1ee] px-4 py-3 text-sm text-[#8b2c18]">
          {error}
        </div>
      ) : null}

      <div className="mt-8 flex flex-col gap-3">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center justify-center rounded-[22px] bg-[#121826] px-5 py-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isLoading ? "Création..." : "Créer mon compte"}
        </button>
        <Link
          href="/connexion"
          className="inline-flex items-center justify-center rounded-[22px] border border-[#d7e0ed] px-5 py-4 text-sm font-semibold text-[#182033]"
        >
          J’ai déjà un compte
        </Link>
      </div>
    </form>
  );
}

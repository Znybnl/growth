"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { APP_NAME } from "@/lib/branding";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
      });
      const payload = (await response.json()) as {
        error?: string;
        merchant?: { onboardingCompleted?: boolean };
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Connexion impossible.");
      }

      router.push(payload.merchant?.onboardingCompleted ? "/" : "/onboarding");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Connexion impossible.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="flex h-full flex-col justify-center" onSubmit={handleSubmit}>
      <div>
        <h1 className="text-[46px] font-semibold leading-[1.02] tracking-[-0.04em] text-[#0f1728]">
          Connectez-vous a {APP_NAME}
        </h1>
        <p className="mt-4 text-base leading-7 text-[#6b7280]">
          Retrouvez vos campagnes, vos leads et vos performances depuis votre espace
          marchand.
        </p>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled
          className="flex h-14 items-center justify-center gap-3 rounded-xl border border-[#e3e8f1] bg-white text-base font-medium text-[#111827] opacity-60"
        >
          <span className="text-lg text-[#34a853]">G</span>
          <span>Google</span>
        </button>
        <button
          type="button"
          disabled
          className="flex h-14 items-center justify-center gap-3 rounded-xl border border-[#e3e8f1] bg-white text-base font-medium text-[#111827] opacity-60"
        >
          <span className="text-lg text-[#1f5fd6]">f</span>
          <span>Facebook</span>
        </button>
      </div>

      <div className="mt-8 flex items-center gap-4">
        <div className="h-px flex-1 bg-[#e7ecf4]" />
        <span className="text-sm text-[#9ca3af]">ou continuez par email</span>
        <div className="h-px flex-1 bg-[#e7ecf4]" />
      </div>

      <div className="mt-8 space-y-4">
        <label className="block text-sm">
          <span className="sr-only">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            className="h-14 w-full rounded-xl border border-[#dfe6f0] bg-white px-4 text-base text-[#111827] outline-none transition placeholder:text-[#9aa4b2] focus:border-[#1f5fd6] focus:shadow-[0_0_0_4px_rgba(31,95,214,0.08)]"
            required
          />
        </label>

        <label className="block text-sm">
          <span className="sr-only">Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            className="h-14 w-full rounded-xl border border-[#dfe6f0] bg-white px-4 text-base text-[#111827] outline-none transition placeholder:text-[#9aa4b2] focus:border-[#1f5fd6] focus:shadow-[0_0_0_4px_rgba(31,95,214,0.08)]"
            required
          />
        </label>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 text-sm">
        <label className="flex items-center gap-3 text-[#6b7280]">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="h-4 w-4 rounded border-[#cfd7e3] text-[#1f5fd6]"
          />
          <span>Remember me</span>
        </label>
        <Link href="/inscription" className="font-medium text-[#1f5fd6]">
          Create an account
        </Link>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-[#f6c4bb] bg-[#fff1ee] px-4 py-3 text-sm text-[#8b2c18]">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        className="mt-8 h-14 w-full rounded-xl bg-[#1f5fd6] text-base font-semibold text-white shadow-[0_14px_28px_rgba(31,95,214,0.22)] transition hover:bg-[#1b54bf] disabled:opacity-60"
      >
        {isLoading ? "Connexion..." : "Log in"}
      </button>

      <div className="mt-8 text-center text-sm text-[#6b7280]">
        <span>Demo access: </span>
        <span className="font-medium text-[#111827]">camille@maisonsora.fr / demo1234</span>
      </div>
    </form>
  );
}

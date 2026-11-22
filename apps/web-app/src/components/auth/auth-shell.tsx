"use client";

import { Star } from "lucide-react";

import { APP_NAME_CAPITALIZED, APP_TAGLINE } from "@/lib/branding";
import { SignupProductPanel } from "@/components/auth/signup-product-panel";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  asideTitle: string;
  asideBody: string;
  asideItems: string[];
  flatContent?: boolean;
  children: React.ReactNode;
};

export function AuthShell({
  eyebrow,
  flatContent = false,
  children,
}: AuthShellProps) {
  if (eyebrow === "Inscription marchand" || eyebrow === "Connexion marchand") {
    return <div className="okado-auth-shell min-h-screen overflow-x-hidden bg-linen-canvas">
      <div className="grid min-h-screen lg:grid-cols-[48%_52%]">
        <section className="okado-auth-column flex min-h-screen justify-center overflow-y-auto bg-linen-canvas px-5 py-3 sm:px-8 sm:py-4 lg:items-[safe_center] lg:px-8 lg:py-4">
          <div className="flex min-h-[calc(100svh-2rem)] w-full max-w-[480px] flex-col justify-center">
            <div data-testid="auth-brand" className="okado-auth-brand mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[12px] text-white shadow-sm" style={{ background: "var(--gradient-hero-blue-fade)" }}><Star className="h-5 w-5 fill-white text-white" aria-hidden="true" /></div>
              <div><p className="text-2xl font-semibold tracking-[-0.04em] text-aubergine">{APP_NAME_CAPITALIZED}</p><p className="text-sm text-ash">Espace professionnel</p></div>
            </div>
            <div data-testid="auth-card" className="w-full rounded-2xl bg-white px-5 shadow-[0_8px_36px_rgba(67,26,76,.07)] ring-1 ring-[#ece3ef] sm:px-6">{children}</div>
          </div>
        </section>
        <SignupProductPanel mode={eyebrow === "Connexion marchand" ? "signin" : "signup"} />
      </div>
    </div>;
  }
  return (
    <div className="okado-auth-shell min-h-screen overflow-x-hidden bg-linen-canvas">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="okado-auth-column flex min-h-screen justify-center overflow-y-auto bg-linen-canvas px-4 py-5 sm:px-6 sm:py-6 lg:items-[safe_center] lg:px-8 lg:py-4 xl:px-10">
          <div className="flex min-h-[calc(100svh-2rem)] w-full max-w-[620px] flex-col justify-center">
            <div data-testid="auth-brand" className="okado-auth-brand mb-6 flex items-center gap-3 sm:mb-8">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-[12px] text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-sm"
                style={{ background: "var(--gradient-hero-blue-fade)" }}
              >
                <Star className="h-5 w-5 fill-white text-white" aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-[-0.04em] text-aubergine">
                  {APP_NAME_CAPITALIZED}
                </p>
                <p className="text-sm text-ash">{APP_TAGLINE}</p>
              </div>
            </div>
            <div
              data-testid={flatContent ? "auth-card" : undefined}
              className={
                flatContent
                  ? "mx-auto w-full max-w-[560px]"
                  : "okado-card mx-auto w-full max-w-[560px] overflow-hidden rounded-none border-0 bg-transparent p-0 shadow-none sm:rounded-[var(--okado-radius-card)] sm:border sm:bg-card sm:p-1 sm:shadow-[var(--shadow-product-card)]"
              }
            >
              {children}
            </div>
          </div>
        </section>

        <SignupProductPanel mode="onboarding" />
      </div>
    </div>
  );
}

"use client";

import { Check, Star } from "lucide-react";

import { APP_NAME_CAPITALIZED, APP_TAGLINE } from "@/lib/branding";

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
  title,
  description,
  flatContent = false,
  children,
}: AuthShellProps) {
  const visualCopy =
    eyebrow === "Onboarding boutique"
      ? {
          title: "Une base prête pour votre première campagne.",
          body: "Renseignez l’essentiel maintenant ; tout reste modifiable depuis votre compte.",
          items: [
            "Définissez les informations de votre commerce",
            "Préparez vos liens marketing réutilisables",
            "Commencez quand vous êtes prêt",
          ],
        }
      : eyebrow === "Inscription marchand"
        ? {
            title: "De la première campagne au suivi des gains.",
            body: "Configurez votre jeu, vos actions et vos lots, puis suivez les résultats.",
            items: [
              "Créez une expérience mobile en quelques minutes",
              "Choisissez la roue ou le ticket à gratter",
              "Pilotez campagnes, données et dotations",
            ],
          }
        : {
            title: "Pilotez vos campagnes sans vous disperser.",
            body: "Créez, diffusez et mesurez vos jeux en magasin depuis un seul espace.",
            items: [
              "Visualisez vos campagnes actives",
              "Suivez les participations et les lots",
              "Mesurez les résultats jour après jour",
            ],
          };

  return (
    <div className="okado-auth-shell min-h-screen overflow-x-hidden bg-linen-canvas">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="flex min-h-screen justify-center overflow-y-auto bg-linen-canvas px-4 py-8 sm:px-6 lg:px-8 xl:px-10 xl:py-10">
          <div className="flex w-full max-w-[620px] flex-col justify-center">
            <div className="mb-8 flex items-center gap-3">
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

        <section
          className="relative hidden min-h-screen overflow-hidden lg:flex lg:flex-col lg:items-center lg:justify-center"
          style={{ background: "var(--color-deep-plum)" }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_18%,rgba(255,255,255,0.22),transparent_34%),linear-gradient(135deg,transparent_0%,rgba(97,31,105,0.28)_100%)]" />

          <div className="relative flex w-full max-w-[760px] flex-1 items-center justify-center px-10 sm:px-14">
            <div className="relative h-[390px] w-full max-w-[560px]">
              <div className="absolute inset-x-[5%] top-[4%] rounded-[16px] border border-white/30 bg-white/95 p-5 shadow-[0_28px_80px_rgba(72,26,84,0.22)]">
                <div className="flex items-center justify-between border-b border-fog pb-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-aubergine">
                      Pilotage local
                    </p>
                    <p className="mt-1 text-lg font-semibold tracking-[-0.03em] text-graphite">
                      Vos campagnes en un coup d’œil
                    </p>
                  </div>
                  <span className="rounded-full bg-[#e9f8ef] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#18864b]">
                    Actif
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2">
                  {[
                    ["Campagnes", "03"],
                    ["Participations", "128"],
                    ["Lots remis", "42"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[12px] bg-linen-canvas px-3 py-3">
                      <p className="text-[10px] uppercase tracking-[0.08em] text-ash">{label}</p>
                      <p className="mt-2 text-xl font-semibold tracking-[-0.04em] text-aubergine">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-[12px] border border-fog p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-graphite">Activité des 7 derniers jours</p>
                    <span className="text-[10px] font-medium text-ash">+18%</span>
                  </div>
                  <div className="mt-4 flex h-20 items-end gap-2">
                    {[32, 48, 38, 62, 54, 78, 68, 88].map((height, index) => (
                      <span
                        key={index}
                        className="flex-1 rounded-t-[6px] bg-aubergine/80"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative w-full max-w-[620px] px-14 pb-16 text-center text-white">
            <p className="text-[30px] font-semibold leading-tight tracking-[-0.03em]">{visualCopy.title}</p>
            <p className="mx-auto mt-4 max-w-[480px] text-base leading-7 text-white/75">{visualCopy.body}</p>
            <ul className="mx-auto mt-6 grid max-w-[480px] gap-2 text-left text-sm text-white/78">
              {visualCopy.items.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-white" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="sr-only">
              <span>{eyebrow}</span>
              <span>{title}</span>
              <span>{description}</span>
              {visualCopy.items.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

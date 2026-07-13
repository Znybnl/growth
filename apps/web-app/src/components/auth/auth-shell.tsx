"use client";

import { Star } from "lucide-react";

import { APP_NAME_CAPITALIZED, APP_TAGLINE } from "@/lib/branding";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  asideTitle: string;
  asideBody: string;
  asideItems: string[];
  children: React.ReactNode;
};

export function AuthShell({
  eyebrow,
  title,
  description,
  asideTitle,
  asideBody,
  asideItems,
  children,
}: AuthShellProps) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-linen-canvas">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
        <section className="flex min-h-screen justify-center overflow-y-auto bg-linen-canvas px-4 py-8 sm:px-6 lg:px-10 xl:px-12 xl:py-10">
          <div className="flex w-full max-w-[760px] flex-col justify-center">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[var(--gradient-hero-blue-fade)] text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-sm">
                <Star className="h-5 w-5 fill-white text-white" aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-[-0.04em] text-signal-blue">
                  {APP_NAME_CAPITALIZED}
                </p>
                <p className="text-sm text-ash">{APP_TAGLINE}</p>
              </div>
            </div>
            <div className="okado-card p-0 sm:p-1">
              {children}
            </div>
          </div>
        </section>

        <section className="relative hidden min-h-screen overflow-hidden bg-[var(--gradient-hero-blue-fade)] lg:flex lg:flex-col lg:items-center lg:justify-center">
          <div className="absolute inset-0">
            <div className="absolute left-1/2 top-[18%] h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-[#2c7be7]" />
            <div className="absolute left-1/2 top-[26%] h-[320px] w-[320px] -translate-x-1/2 rounded-full border border-white/10" />
          </div>

          <div className="relative flex w-full max-w-[620px] flex-1 items-center justify-center px-14">
            <div className="relative h-[390px] w-full max-w-[420px]">
              <div className="absolute left-[4%] top-[20%] flex h-20 w-20 items-center justify-center rounded-full border border-white/16 bg-white shadow-[0_16px_35px_rgba(6,31,86,0.18)]">
                <span className="text-3xl text-signal-blue">O</span>
              </div>
              <div className="absolute left-[10%] top-[54%] flex h-20 w-20 items-center justify-center rounded-full border border-white/16 bg-white shadow-[0_16px_35px_rgba(6,31,86,0.18)]">
                <span className="text-3xl text-[#34a853]">K</span>
              </div>
              <div className="absolute left-[12%] top-[6%] flex h-20 w-20 items-center justify-center rounded-full border border-white/16 bg-white shadow-[0_16px_35px_rgba(6,31,86,0.18)]">
                <span className="text-3xl text-[#f6c04b]">O</span>
              </div>
              <div className="absolute left-[23%] top-[38%] h-4 w-[138px] rounded-full bg-white/16" />
              <div className="absolute left-[46%] top-[10%] w-[54%] rounded-[16px] bg-white p-5 shadow-product-card">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff6b6b]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ffd166]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#4ade80]" />
                </div>
                <div className="mt-5 space-y-4">
                  {[0, 1, 2].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 rounded-[8px] border border-border bg-linen-canvas px-3 py-3"
                    >
                      <div className="h-10 w-10 rounded-full bg-[#e5ecfa]" />
                      <div className="flex-1">
                        <div className="h-2.5 w-20 rounded-full bg-[#a7b7d9]" />
                        <div className="mt-2 h-2.5 w-28 rounded-full bg-[#d8e2f5]" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="relative w-full max-w-[620px] px-14 pb-16 text-center text-white">
            <p className="text-[30px] font-semibold leading-tight tracking-[-0.03em]">{asideTitle}</p>
            <p className="mt-4 text-base text-white/72">{asideBody}</p>
            <div className="mt-8 flex items-center justify-center gap-3">
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className={`h-2.5 w-2.5 rounded-full ${dot === 0 ? "bg-white" : "bg-white/28"}`}
                />
              ))}
            </div>
            <div className="sr-only">
              <span>{eyebrow}</span>
              <span>{title}</span>
              <span>{description}</span>
              {asideItems.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

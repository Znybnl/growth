"use client";

import { APP_NAME, APP_TAGLINE } from "@/lib/branding";

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
    <div className="h-screen overflow-hidden bg-[#f3f6fb]">
      <div className="grid h-full xl:grid-cols-2">
        <section className="flex h-full items-center justify-center bg-white px-6 py-8 lg:px-12">
          <div className="w-full max-w-[430px]">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1f5fd6] text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-[0_10px_24px_rgba(31,95,214,0.22)]">
                OK
              </div>
              <div>
                <p className="text-xl font-semibold tracking-tight text-[#1f5fd6]">{APP_NAME}</p>
                <p className="text-sm text-[#7b8496]">{APP_TAGLINE}</p>
              </div>
            </div>
            {children}
          </div>
        </section>

        <section className="relative hidden h-full overflow-hidden bg-[linear-gradient(180deg,#1f5fd6_0%,#1a58ca_100%)] xl:flex xl:flex-col xl:items-center xl:justify-center">
          <div className="absolute inset-0">
            <div className="absolute left-1/2 top-[18%] h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-[#2c7be7]" />
            <div className="absolute left-1/2 top-[26%] h-[320px] w-[320px] -translate-x-1/2 rounded-full border border-white/10" />
          </div>

          <div className="relative flex w-full max-w-[620px] flex-1 items-center justify-center px-14">
            <div className="relative h-[390px] w-full max-w-[420px]">
              <div className="absolute left-[4%] top-[20%] flex h-20 w-20 items-center justify-center rounded-full border border-white/16 bg-white shadow-[0_16px_35px_rgba(6,31,86,0.18)]">
                <span className="text-3xl text-[#2f6df6]">O</span>
              </div>
              <div className="absolute left-[10%] top-[54%] flex h-20 w-20 items-center justify-center rounded-full border border-white/16 bg-white shadow-[0_16px_35px_rgba(6,31,86,0.18)]">
                <span className="text-3xl text-[#34a853]">K</span>
              </div>
              <div className="absolute left-[12%] top-[6%] flex h-20 w-20 items-center justify-center rounded-full border border-white/16 bg-white shadow-[0_16px_35px_rgba(6,31,86,0.18)]">
                <span className="text-3xl text-[#f6c04b]">O</span>
              </div>
              <div className="absolute left-[23%] top-[38%] h-4 w-[138px] rounded-full bg-white/16" />
              <div className="absolute left-[46%] top-[10%] w-[54%] rounded-[26px] bg-white p-5 shadow-[0_30px_55px_rgba(8,30,84,0.18)]">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff6b6b]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ffd166]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#4ade80]" />
                </div>
                <div className="mt-5 space-y-4">
                  {[0, 1, 2].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 rounded-[18px] border border-[#eef3fb] bg-[#fbfdff] px-3 py-3"
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
            <p className="text-[30px] font-semibold leading-tight">{asideTitle}</p>
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

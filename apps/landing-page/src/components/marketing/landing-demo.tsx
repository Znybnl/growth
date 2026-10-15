"use client";

import { useEffect, useRef, useState } from "react";
import { Gift, Mail, RotateCw, Star } from "lucide-react";
import { captureMarketingEvent } from "@/lib/marketing-analytics";

const wheelSegments = [
  { label: "Dessert", fill: "#9aa7e6" },
  { label: "Perdu", fill: "#162238" },
  { label: "Café", fill: "#f8fafc" },
  { label: "Perdu", fill: "#162238" },
  { label: "Remise", fill: "#f8fafc" },
  { label: "Perdu", fill: "#162238" },
  { label: "Boisson", fill: "#9aa7e6" },
  { label: "Perdu", fill: "#162238" },
  { label: "Surprise", fill: "#f8fafc" },
  { label: "Perdu", fill: "#162238" },
];

const beautyWheelSegments = [
  { label: "Soin", fill: "#edb9c8" },
  { label: "Perdu", fill: "#3b1936" },
  { label: "-10%", fill: "#fff8f2" },
  { label: "Perdu", fill: "#3b1936" },
  { label: "Mini soin", fill: "#edb9c8" },
  { label: "Perdu", fill: "#3b1936" },
  { label: "15€", fill: "#fff8f2" },
  { label: "Perdu", fill: "#3b1936" },
  { label: "Trousse", fill: "#edb9c8" },
  { label: "Perdu", fill: "#3b1936" },
];

function createWheelGradient(segments: typeof wheelSegments) {
  return `conic-gradient(from 0deg, ${segments
    .map((segment, index) => {
      const start = index * 36;
      const end = start + 36;
      return `${segment.fill} ${start}deg ${end}deg`;
    })
    .join(", ")})`;
}
const winningSegmentCenterDegrees = 18;
const winningRotationDegrees = 360 - winningSegmentCenterDegrees;

const demoChartData = [
  { day: "Lun.", scans: 22, leads: 7 },
  { day: "Mar.", scans: 34, leads: 11 },
  { day: "Mer.", scans: 29, leads: 9 },
  { day: "Jeu.", scans: 48, leads: 17 },
  { day: "Ven.", scans: 61, leads: 23 },
  { day: "Sam.", scans: 74, leads: 31 },
  { day: "Dim.", scans: 52, leads: 19 },
];

export function LandingDemo({
  variant = "restaurant",
}: {
  variant?: "restaurant" | "beauty";
}) {
  const [step, setStep] = useState<
    "intro" | "action" | "spinning" | "form" | "done"
  >("intro");
  const [rotation, setRotation] = useState(16);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const hasModal = step === "action" || step === "form" || step === "done";
  const isBeauty = variant === "beauty";
  const segments = isBeauty ? beautyWheelSegments : wheelSegments;
  const wheelGradient = createWheelGradient(segments);
  const accentColor = isBeauty ? "#9b3e62" : "#d6a51f";
  const businessName = isBeauty ? "L'atelier beauté" : "Le bistro";
  const gameHeading = isBeauty ? "Prenez soin de vous." : "Jouez et gagnez.";
  const rewardLabel = isBeauty ? "un soin découverte" : "1 dessert";

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const kpis = [
    { label: "Scans", value: "320" },
    { label: "Participations", value: "224" },
    { label: "Contacts collectés", value: "117" },
    { label: "Conversion parties / scans", value: "70 %" },
  ];

  const resetDemo = () => {
    if (timer.current) clearTimeout(timer.current);
    setStep("intro");
    setFirstName("");
    setEmail("");
    setRotation(16);
  };

  const startSpin = () => {
    if (step === "intro") {
      captureMarketingEvent("marketing_demo_started", { variant });
    }
    setStep("spinning");
    setRotation((value) => {
      const normalizedRotation = ((value % 360) + 360) % 360;
      const rotationToWinningSegment =
        (winningRotationDegrees - normalizedRotation + 360) % 360;

      return value + 4 * 360 + rotationToWinningSegment;
    });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setStep("form"), 2100);
  };

  const complete = () => {
    setStep("done");
    captureMarketingEvent("marketing_demo_completed", { variant });
  };

  return (
    <div className="relative mx-auto mt-16 max-w-[1080px]">
      <p className="relative z-10 mb-4 text-center text-sm text-[#475569]">
        Démonstration simplifiée : aucun lot réel, aucune coordonnée transmise,
        aucun e-mail envoyé.
      </p>
      <div className="absolute left-[8%] top-8 h-56 w-56 rounded-full bg-[#fb64b6]/20 blur-3xl" />
      <div className="absolute right-[10%] top-0 h-64 w-64 rounded-full bg-[#6c00f6]/15 blur-3xl" />

      <div className="relative grid items-stretch gap-5 rounded-[24px] border border-[#e5e7eb] bg-white p-5 shadow-[0_24px_80px_rgba(15,23,43,0.12)] md:grid-cols-[0.86fr_1.14fr] md:p-8">
        <div className="flex flex-col items-center justify-center rounded-[20px] border border-[#e5e7eb] bg-[#f8fafc] p-4">
          <div className="mx-auto max-w-[300px] overflow-hidden rounded-[32px] border-[10px] border-[#0f172b] bg-white shadow-[0_20px_50px_rgba(15,23,43,0.18)]">
            <div className="relative min-h-[560px] overflow-hidden bg-[radial-gradient(circle_at_top,#fff7ed_0%,#ffffff_42%,#eef2ff_100%)] px-5 py-7 text-center">
              <p className="text-[24px] font-black tracking-[-0.05em] text-[#0f172b]">
                {businessName}
              </p>
              <p className="mt-8 text-[31px] font-black leading-[1.03] tracking-[-0.05em] text-[#0f172b]">
                {gameHeading}
              </p>

              {hasModal ? (
                <div
                  className="absolute inset-0 z-30 bg-[#0f172b]/55 backdrop-blur-[2px]"
                  aria-hidden="true"
                />
              ) : null}

              {step === "action" && (
                <div className="absolute left-5 right-5 top-[126px] z-40 rounded-[18px] border border-[#e5e7eb] bg-white/95 p-4 text-center shadow-[0_20px_45px_rgba(15,23,43,0.18)] backdrop-blur">
                  <Star
                    className="mx-auto h-8 w-8"
                    style={{ color: accentColor }}
                  />
                  <p className="mt-3 text-base font-black tracking-[-0.03em] text-[#0f172b]">
                    Partager votre expérience ?
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#475569]">
                    Un avis reste facultatif, libre et indépendant du jeu. Dans
                    cette démo, aucun avis n’est publié.
                  </p>
                  <button
                    type="button"
                    onClick={startSpin}
                    className="mt-3 rounded-[10px] px-4 py-2 text-xs font-black text-white"
                    style={{ backgroundColor: accentColor }}
                  >
                    Simuler le clic vers Google
                  </button>
                  <button
                    type="button"
                    onClick={startSpin}
                    className="mt-3 block w-full rounded-lg border border-[#64748b] px-2 py-2 text-xs font-bold text-[#0f172b]"
                  >
                    Continuer sans laisser d’avis
                  </button>
                </div>
              )}

              {step === "form" && (
                <div className="absolute left-5 right-5 top-[108px] z-40 rounded-[18px] border border-[#e5e7eb] bg-white/95 p-4 text-center shadow-[0_20px_45px_rgba(15,23,43,0.18)] backdrop-blur">
                  <Gift className="mx-auto h-8 w-8 text-[#6c00f6]" />
                  <p className="mt-3 text-base font-black tracking-[-0.03em] text-[#0f172b]">
                    Bravo, vous avez gagné {rewardLabel}.
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#475569]">
                    Exemple de formulaire après un gain. Vous pouvez laisser ces
                    champs vides dans la démo.
                  </p>
                  <div className="mt-3 grid gap-2">
                    <input
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      placeholder="Prénom"
                      aria-label="Prénom de démonstration"
                      className="h-10 rounded-[10px] border border-[#dbe3ef] bg-white px-3 text-sm text-[#0f172b] outline-none focus:border-[#6c00f6]"
                    />
                    <input
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="E-mail"
                      aria-label="E-mail de démonstration"
                      type="email"
                      className="h-10 rounded-[10px] border border-[#dbe3ef] bg-white px-3 text-sm text-[#0f172b] outline-none focus:border-[#6c00f6]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={complete}
                    className="mt-3 inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#0f172b] px-4 py-2 text-xs font-black text-white"
                  >
                    Simuler la confirmation
                    <Mail className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {step === "done" && (
                <div className="absolute left-5 right-5 top-[132px] z-40 rounded-[18px] border border-[#e5e7eb] bg-white/95 p-4 text-center shadow-[0_20px_45px_rgba(15,23,43,0.18)] backdrop-blur">
                  <Mail className="mx-auto h-8 w-8 text-[#6c00f6]" />
                  <p className="mt-3 text-base font-black tracking-[-0.03em] text-[#0f172b]">
                    Exemple de confirmation du gain.
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#475569]">
                    Dans une campagne réelle, le joueur reçoit ses informations
                    de retrait. Aucun e-mail n’est envoyé ici.
                  </p>
                </div>
              )}

              <div className="relative mt-10 h-[330px]">
                <div
                  className="absolute left-1/2 top-[66px] h-[410px] w-[410px] -translate-x-1/2 rounded-full border-[10px] border-white shadow-[inset_0_0_38px_rgba(15,23,43,0.14),0_22px_55px_rgba(15,23,43,0.16)] transition-transform duration-[1650ms]"
                  style={{
                    background: wheelGradient,
                    transform: `rotate(${rotation}deg)`,
                    transitionTimingFunction:
                      "cubic-bezier(0.12, 0.86, 0.08, 1)",
                  }}
                >
                  {segments.map((segment, index) => (
                    <span
                      key={`${segment.label}-${index}`}
                      className="absolute left-1/2 top-1/2 h-0 w-0 origin-center"
                      style={{
                        transform: `rotate(${index * 36 + winningSegmentCenterDegrees}deg)`,
                      }}
                    >
                      <span
                        className="absolute left-0 top-0 whitespace-nowrap text-[14px] font-black uppercase leading-none tracking-[-0.05em]"
                        style={{
                          color: "#ffffff",
                          textShadow:
                            "0 1px 0 rgba(15,23,43,0.78), 0 -1px 0 rgba(15,23,43,0.62), 1px 0 0 rgba(15,23,43,0.62), -1px 0 0 rgba(15,23,43,0.62), 0 5px 12px rgba(15,23,43,0.28)",
                          transform: "translate(-50%, -158px)",
                          writingMode: "vertical-rl",
                        }}
                      >
                        {segment.label}
                      </span>
                    </span>
                  ))}
                </div>

                <div className="absolute left-1/2 top-[168px] z-10 h-16 w-9 -translate-x-1/2 rounded-t-[18px] bg-white shadow-[0_10px_26px_rgba(15,23,43,0.14)] [clip-path:polygon(50%_0,100%_100%,0_100%)]" />
                <button
                  type="button"
                  onClick={
                    step === "intro" ? () => setStep("action") : startSpin
                  }
                  disabled={
                    step === "spinning" || step === "form" || step === "done"
                  }
                  className="absolute left-1/2 top-[215px] z-20 grid h-28 w-28 -translate-x-1/2 place-items-center rounded-full border-[6px] border-white text-sm font-black uppercase text-white shadow-[0_18px_34px_rgba(15,23,43,0.22)] transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-80"
                  style={{ backgroundColor: accentColor }}
                >
                  {step === "spinning" ? (
                    <RotateCw className="h-6 w-6 animate-spin" />
                  ) : (
                    "Jouer"
                  )}
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={resetDemo}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-[10px] border border-[#dbe3ef] bg-white px-4 py-2.5 text-sm font-bold text-[#0f172b] shadow-[0_10px_24px_rgba(15,23,43,0.06)] transition hover:-translate-y-0.5 hover:border-[#6c00f6]"
          >
            Redémarrer la démo
          </button>
        </div>

        <div className="hidden content-center gap-5 md:grid">
          <div className="rounded-[20px] border border-[#e5e7eb] bg-white p-5 text-left shadow-[0_0_24px_rgba(55,65,81,0.08)]">
            <div className="flex flex-col gap-4 border-b border-[#e5e7eb] pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7f22fe]">
                  Impact en point de vente
                </p>
                <p className="mt-1 text-xl font-semibold text-[#0f172b]">
                  Une animation qui transforme le passage en données activables
                </p>
              </div>
              <span className="w-fit rounded-[4px] bg-[#7f22fe]/10 px-2 py-1 text-xs font-medium text-[#7f22fe]">
                Exemple fictif
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {kpis.map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-[14px] border border-[#e5e7eb] bg-[#f8fafc] p-4"
                >
                  <p className="text-xs font-medium text-[#64748b]">
                    {kpi.label}
                  </p>
                  <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-[#0f172b]">
                    {kpi.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[18px] border border-[#e5e7eb] bg-[#f8fafc] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-black tracking-[-0.03em] text-[#0f172b]">
                    Scans et contacts sur 7 jours
                  </p>
                  <p className="mt-1 text-xs text-[#64748b]">
                    Courbe de démonstration
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold text-[#475569]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#145aff]" />
                    Scans
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#0f1f3d]" />
                    Contacts
                  </span>
                </div>
              </div>

              <div
                className="mt-5 flex h-[220px] items-end gap-3"
                role="img"
                aria-label="Exemple fictif sur 7 jours : 320 scans et 117 contacts collectés. Chaque paire de barres représente un jour."
              >
                {demoChartData.map((day) => (
                  <div
                    key={day.day}
                    className="flex h-full min-w-0 flex-1 flex-col justify-end"
                  >
                    <div className="flex h-[180px] items-end justify-center gap-1">
                      <span
                        title={day.scans + " scans"}
                        className="w-3 rounded-t bg-[#145aff]"
                        style={{ height: (day.scans / 80) * 100 + "%" }}
                      />
                      <span
                        title={day.leads + " contacts"}
                        className="w-3 rounded-t bg-[#0f1f3d]"
                        style={{ height: (day.leads / 80) * 100 + "%" }}
                      />
                    </div>
                    <span className="mt-3 text-center text-xs text-[#64748b]">
                      {day.day}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Gift, Mail, RotateCw, Star } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const prizes = [
  "Dessert",
  "Perdu",
  "Cafe",
  "Perdu",
  "Remise",
  "Perdu",
  "Boisson",
  "Perdu",
  "Surprise",
  "Perdu",
];

const demoChartConfig = {
  scans: {
    label: "Scans",
    color: "#145aff",
  },
  leads: {
    label: "Leads",
    color: "#0f1f3d",
  },
} satisfies ChartConfig;

const demoChartData = [
  { day: "Lun.", scans: 22, leads: 7 },
  { day: "Mar.", scans: 34, leads: 11 },
  { day: "Mer.", scans: 29, leads: 9 },
  { day: "Jeu.", scans: 48, leads: 17 },
  { day: "Ven.", scans: 61, leads: 23 },
  { day: "Sam.", scans: 74, leads: 31 },
  { day: "Dim.", scans: 52, leads: 19 },
];

function getInitialCountry() {
  if (typeof window === "undefined") {
    return "FR";
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get("country")?.toUpperCase() === "CA") {
    return "CA";
  }

  const locale = navigator.language.toLowerCase();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone.toLowerCase();

  return locale.includes("-ca") || timezone.includes("canada") || timezone.includes("toronto")
    ? "CA"
    : "FR";
}

export function LocalizedPrice() {
  const [country] = useState<"FR" | "CA">(getInitialCountry);

  if (country === "CA") {
    return (
      <>
        <div className="mt-4 flex items-end gap-2">
          <span className="text-6xl font-bold tracking-[-0.06em] text-[#0f172b]">29$</span>
          <span className="pb-2 text-sm font-medium text-[#475569]">CAD / mois</span>
        </div>
        <p className="mt-4 text-sm leading-6 text-[#475569]">
          Prix affiché pour le Canada. Taxes calculées au moment de la facturation.
        </p>
      </>
    );
  }

  return (
    <>
      <div className="mt-4 flex items-end gap-2">
        <span className="text-6xl font-bold tracking-[-0.06em] text-[#0f172b]">20€</span>
        <span className="pb-2 text-sm font-medium text-[#475569]">HT / mois</span>
      </div>
      <p className="mt-4 text-sm leading-6 text-[#475569]">
        Soit 24,00 € TTC en France avec TVA à 20%. Sans engagement.
      </p>
    </>
  );
}

export function LandingDemo() {
  const [step, setStep] = useState<"intro" | "action" | "spinning" | "form" | "done">("intro");
  const [rotation, setRotation] = useState(16);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");

  const kpis = useMemo(
    () => [
      { label: "Scans cette semaine", value: "320", trend: "+28%" },
      { label: "Leads collectés", value: "117", trend: "+19%" },
      { label: "Taux de conversion", value: "36%", trend: "+6 pts" },
    ],
    [],
  );

  const resetDemo = () => {
    setStep("intro");
    setFirstName("");
    setEmail("");
    setRotation(16);
  };

  const startSpin = () => {
    setStep("spinning");
    setRotation((value) => value + 1440 + 34);
    window.setTimeout(() => setStep("form"), 1150);
  };

  const complete = () => {
    if (!firstName.trim() || !email.trim()) {
      return;
    }

    setStep("done");
  };

  return (
    <div className="relative mx-auto mt-16 max-w-[1080px]">
      <div className="absolute left-[8%] top-8 h-56 w-56 rounded-full bg-[#fb64b6]/20 blur-3xl" />
      <div className="absolute right-[10%] top-0 h-64 w-64 rounded-full bg-[#6c00f6]/15 blur-3xl" />

      <div className="relative grid items-stretch gap-5 rounded-[24px] border border-[#e5e7eb] bg-white p-5 shadow-[0_24px_80px_rgba(15,23,43,0.12)] md:grid-cols-[0.86fr_1.14fr] md:p-8">
        <div className="flex flex-col items-center justify-center rounded-[20px] border border-[#e5e7eb] bg-[#f8fafc] p-4">
          <div className="mx-auto max-w-[300px] overflow-hidden rounded-[32px] border-[10px] border-[#0f172b] bg-white shadow-[0_20px_50px_rgba(15,23,43,0.18)]">
            <div className="relative min-h-[560px] overflow-hidden bg-[radial-gradient(circle_at_top,#fff7ed_0%,#ffffff_42%,#eef2ff_100%)] px-5 py-7 text-center">
              <p className="text-[24px] font-black tracking-[-0.05em] text-[#0f172b]">
                La petite cuillère
              </p>
              <p className="mt-4 text-[31px] font-black leading-[1.03] tracking-[-0.05em] text-[#0f172b]">
                Jouez et gagnez.
              </p>

              {step === "action" && (
                <div className="absolute left-5 right-5 top-[126px] z-30 rounded-[18px] border border-[#e5e7eb] bg-white/95 p-4 text-center shadow-[0_20px_45px_rgba(15,23,43,0.18)] backdrop-blur">
                  <Star className="mx-auto h-8 w-8 text-[#d6a51f]" />
                  <p className="mt-3 text-base font-black tracking-[-0.03em] text-[#0f172b]">
                    Laissez un avis Google
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#475569]">
                    Partagez votre expérience, puis lancez la roue.
                  </p>
                  <button
                    type="button"
                    onClick={startSpin}
                    className="mt-3 rounded-[10px] bg-[#d6a51f] px-4 py-2 text-xs font-black text-white"
                  >
                    Écrire un avis
                  </button>
                </div>
              )}

              {step === "form" && (
                <div className="absolute left-5 right-5 top-[108px] z-30 rounded-[18px] border border-[#e5e7eb] bg-white/95 p-4 text-center shadow-[0_20px_45px_rgba(15,23,43,0.18)] backdrop-blur">
                  <Gift className="mx-auto h-8 w-8 text-[#6c00f6]" />
                  <p className="mt-3 text-base font-black tracking-[-0.03em] text-[#0f172b]">
                    Bravo, vous avez gagné 1 dessert.
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#475569]">
                    Renseignez vos coordonnées pour recevoir le coupon.
                  </p>
                  <div className="mt-3 grid gap-2">
                    <input
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      placeholder="Prénom"
                      className="h-10 rounded-[10px] border border-[#dbe3ef] bg-white px-3 text-sm text-[#0f172b] outline-none focus:border-[#6c00f6]"
                    />
                    <input
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="E-mail"
                      type="email"
                      className="h-10 rounded-[10px] border border-[#dbe3ef] bg-white px-3 text-sm text-[#0f172b] outline-none focus:border-[#6c00f6]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={complete}
                    className="mt-3 inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#0f172b] px-4 py-2 text-xs font-black text-white"
                  >
                    Récupérer mon lot
                    <Mail className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {step === "done" && (
                <div className="absolute left-5 right-5 top-[132px] z-30 rounded-[18px] border border-[#e5e7eb] bg-white/95 p-4 text-center shadow-[0_20px_45px_rgba(15,23,43,0.18)] backdrop-blur">
                  <Mail className="mx-auto h-8 w-8 text-[#6c00f6]" />
                  <p className="mt-3 text-base font-black tracking-[-0.03em] text-[#0f172b]">
                    Coupon envoyé par e-mail.
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#475569]">
                    Le QR Code de retrait est prêt à présenter en boutique.
                  </p>
                </div>
              )}

              <div className="relative mt-10 h-[330px]">
                <div
                  className="absolute left-1/2 top-0 h-[410px] w-[410px] -translate-x-1/2 rounded-full border-[10px] border-white bg-[conic-gradient(from_0deg,#9aa7e6_0_36deg,#162238_36deg_72deg,#f8fafc_72deg_108deg,#162238_108deg_144deg,#f8fafc_144deg_180deg,#9aa7e6_180deg_216deg,#162238_216deg_252deg,#f8fafc_252deg_288deg,#162238_288deg_324deg,#9aa7e6_324deg_360deg)] shadow-[inset_0_0_38px_rgba(15,23,43,0.14),0_22px_55px_rgba(15,23,43,0.16)] transition-transform duration-1000 ease-out"
                  style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
                >
                  {prizes.map((prize, index) => (
                    <span
                      key={`${prize}-${index}`}
                      className="absolute left-1/2 top-1/2 origin-center text-[12px] font-black uppercase leading-[0.95] tracking-[-0.03em]"
                      style={{
                        color: index % 2 === 1 ? "#ffffff" : "#0f172b",
                        transform: `rotate(${index * 36 + 18}deg) translateY(-145px) translateX(-50%)`,
                        writingMode: "vertical-rl",
                      }}
                    >
                      {prize}
                    </span>
                  ))}
                </div>

                <div className="absolute left-1/2 top-[168px] z-10 h-16 w-9 -translate-x-1/2 rounded-t-[18px] bg-white shadow-[0_10px_26px_rgba(15,23,43,0.14)] [clip-path:polygon(50%_0,100%_100%,0_100%)]" />
                <button
                  type="button"
                  onClick={step === "intro" ? () => setStep("action") : startSpin}
                  disabled={step === "spinning" || step === "form" || step === "done"}
                  className="absolute left-1/2 top-[215px] z-20 grid h-28 w-28 -translate-x-1/2 place-items-center rounded-full border-[6px] border-white bg-[#d6a51f] text-sm font-black uppercase text-white shadow-[0_18px_34px_rgba(15,23,43,0.22)] transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-80"
                >
                  {step === "spinning" ? <RotateCw className="h-6 w-6 animate-spin" /> : "Jouer"}
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

        <div className="grid content-center gap-5">
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

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {kpis.map((kpi) => (
                <div key={kpi.label} className="rounded-[14px] border border-[#e5e7eb] bg-[#f8fafc] p-4">
                  <p className="text-xs font-medium text-[#64748b]">{kpi.label}</p>
                  <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-[#0f172b]">
                    {kpi.value}
                  </p>
                  <p className="mt-1 text-xs font-bold text-[#16a34a]">{kpi.trend}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[18px] border border-[#e5e7eb] bg-[#f8fafc] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-black tracking-[-0.03em] text-[#0f172b]">
                    Scans et leads sur 7 jours
                  </p>
                  <p className="mt-1 text-xs text-[#64748b]">Courbe de démonstration</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold text-[#475569]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#145aff]" />
                    Scans
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#0f1f3d]" />
                    Leads
                  </span>
                </div>
              </div>

              <ChartContainer
                config={demoChartConfig}
                className="mt-3 h-[250px] w-full"
                initialDimension={{ width: 640, height: 250 }}
              >
                <AreaChart
                  accessibilityLayer
                  data={demoChartData}
                  margin={{ left: 0, right: 10, top: 20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="demoScans" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#145aff" stopOpacity={0.26} />
                      <stop offset="95%" stopColor="#145aff" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="demoLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f1f3d" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#0f1f3d" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#dfe6f2" strokeDasharray="4 8" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={10} />
                  <YAxis hide domain={[0, "dataMax + 12"]} />
                  <ChartTooltip
                    cursor={{ stroke: "#145aff", strokeWidth: 1, strokeDasharray: "4 6" }}
                    content={
                      <ChartTooltipContent
                        className="min-w-[170px] rounded-[8px] border-[#0f172b] bg-[#0f172b] px-3 py-2 text-sm text-white shadow-[0_18px_36px_rgba(15,23,40,0.24)] [&_.text-muted-foreground]:text-white/70"
                        indicator="dot"
                      />
                    }
                  />
                  <Area
                    dataKey="scans"
                    type="monotone"
                    stroke="var(--color-scans)"
                    strokeWidth={3}
                    fill="url(#demoScans)"
                    activeDot={{ r: 5, strokeWidth: 3, stroke: "#ffffff" }}
                  />
                  <Area
                    dataKey="leads"
                    type="monotone"
                    stroke="var(--color-leads)"
                    strokeWidth={3}
                    fill="url(#demoLeads)"
                    activeDot={{ r: 5, strokeWidth: 3, stroke: "#ffffff" }}
                  />
                </AreaChart>
              </ChartContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

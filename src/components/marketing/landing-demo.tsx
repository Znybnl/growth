"use client";

import { useState } from "react";
import { ArrowRight, Gift, Mail, RotateCw, Sparkles, Star } from "lucide-react";

const prizes = [
  "1 dessert",
  "Perdu",
  "Café offert",
  "Perdu",
  "10% remise",
  "Perdu",
  "Boisson",
  "Perdu",
  "Surprise",
  "Perdu",
];

function getInitialCountry() {
  if (typeof window === "undefined") {
    return "FR";
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
          Prix affiché pour le Canada. Les taxes applicables sont calculées au moment de la
          facturation.
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
  const selectedPrize = "1 dessert";

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
      <div className="relative grid gap-5 rounded-[24px] border border-[#e5e7eb] bg-white p-5 shadow-[0_24px_80px_rgba(15,23,43,0.12)] md:grid-cols-[0.86fr_1.14fr] md:p-8">
        <div className="rounded-[20px] border border-[#e5e7eb] bg-[#f8fafc] p-4">
          <div className="mx-auto max-w-[300px] overflow-hidden rounded-[32px] border-[10px] border-[#0f172b] bg-white shadow-[0_20px_50px_rgba(15,23,43,0.18)]">
            <div className="relative min-h-[560px] overflow-hidden bg-[radial-gradient(circle_at_top,#fff7ed_0%,#ffffff_42%,#eef2ff_100%)] px-5 py-7 text-center">
              <p className="text-[24px] font-black tracking-[-0.05em] text-[#0f172b]">
                La petite cuillère
              </p>
              <p className="mt-4 text-[31px] font-black leading-[1.03] tracking-[-0.05em] text-[#0f172b]">
                Jouez et gagnez.
              </p>

              <div className="relative mt-10 h-[330px]">
                <div
                  className="absolute left-1/2 top-0 h-[410px] w-[410px] -translate-x-1/2 rounded-full border-[10px] border-white bg-[conic-gradient(from_0deg,#9aa7e6_0_36deg,#162238_36deg_72deg,#f8fafc_72deg_108deg,#162238_108deg_144deg,#f8fafc_144deg_180deg,#9aa7e6_180deg_216deg,#162238_216deg_252deg,#f8fafc_252deg_288deg,#162238_288deg_324deg,#9aa7e6_324deg_360deg)] shadow-[inset_0_0_38px_rgba(15,23,43,0.14),0_22px_55px_rgba(15,23,43,0.16)] transition-transform duration-1000 ease-out"
                  style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
                >
                  {prizes.map((prize, index) => (
                    <span
                      key={`${prize}-${index}`}
                      className="absolute left-1/2 top-1/2 w-20 origin-[0_0] -translate-y-[165px] -translate-x-1/2 text-[13px] font-black uppercase leading-[0.9] text-white"
                      style={{ transform: `rotate(${index * 36 + 18}deg)` }}
                    >
                      <span className="block rotate-90">{prize}</span>
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

              {step === "intro" && (
                <p className="mt-4 text-sm font-semibold text-[#475569]">
                  Démo interactive : lancez l’expérience comme un client en boutique.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid content-between gap-5">
          <div className="rounded-[20px] border border-[#e5e7eb] bg-white p-5 shadow-[0_0_24px_rgba(55,65,81,0.08)]">
            <div className="flex flex-col gap-4 border-b border-[#e5e7eb] pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7f22fe]">
                  Démo roue sans stockage
                </p>
                <p className="mt-1 text-xl font-semibold text-[#0f172b]">
                  Parcours client en conditions réelles
                </p>
              </div>
              <span className="w-fit rounded-[4px] bg-[#7f22fe]/10 px-2 py-1 text-xs font-medium text-[#7f22fe]">
                100% simulé
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                ["Scans", "1"],
                ["Lead", step === "done" ? "1" : "0"],
                ["Lot", step === "done" ? "Envoyé" : "En attente"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[14px] border border-[#e5e7eb] bg-[#f8fafc] p-4">
                  <p className="text-xs text-[#90a1b9]">{label}</p>
                  <p className="mt-2 text-2xl font-bold text-[#0f172b]">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[18px] border border-[#e5e7eb] bg-[#f8fafc] p-5">
              {step === "intro" && (
                <div>
                  <Sparkles className="h-7 w-7 text-[#6c00f6]" />
                  <h3 className="mt-4 text-xl font-bold tracking-[-0.03em] text-[#0f172b]">
                    Prêt à jouer ?
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#475569]">
                    Le client arrive depuis un QR Code. Il découvre le jeu, puis lance la roue.
                  </p>
                  <button
                    type="button"
                    onClick={() => setStep("action")}
                    className="mt-5 inline-flex items-center gap-2 rounded-[10px] bg-[#0f172b] px-4 py-3 text-sm font-bold text-white"
                  >
                    Démarrer la démo
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {step === "action" && (
                <div>
                  <Star className="h-7 w-7 text-[#d6a51f]" />
                  <h3 className="mt-4 text-xl font-bold tracking-[-0.03em] text-[#0f172b]">
                    Action marketing avant jeu
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#475569]">
                    Exemple : laisser un avis Google. Sur une vraie campagne, le lien s’ouvre dans
                    un nouvel onglet puis le bouton Jouer devient disponible.
                  </p>
                  <button
                    type="button"
                    onClick={startSpin}
                    className="mt-5 inline-flex items-center gap-2 rounded-[10px] bg-[#d6a51f] px-4 py-3 text-sm font-black text-white"
                  >
                    Écrire un avis puis jouer
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {step === "spinning" && (
                <div className="py-7 text-center">
                  <RotateCw className="mx-auto h-8 w-8 animate-spin text-[#6c00f6]" />
                  <p className="mt-4 text-sm font-semibold text-[#475569]">
                    La roue tourne, le lot est réservé...
                  </p>
                </div>
              )}

              {step === "form" && (
                <div>
                  <Gift className="h-7 w-7 text-[#6c00f6]" />
                  <h3 className="mt-4 text-xl font-bold tracking-[-0.03em] text-[#0f172b]">
                    Félicitations, vous avez gagné {selectedPrize}.
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#475569]">
                    Saisissez uniquement prénom et e-mail pour recevoir le coupon de retrait.
                  </p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <input
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      placeholder="Prénom"
                      className="rounded-[12px] border border-[#dbe3ef] bg-white px-4 py-3 text-sm text-[#0f172b] outline-none focus:border-[#6c00f6]"
                    />
                    <input
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="E-mail"
                      type="email"
                      className="rounded-[12px] border border-[#dbe3ef] bg-white px-4 py-3 text-sm text-[#0f172b] outline-none focus:border-[#6c00f6]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={complete}
                    className="mt-5 inline-flex items-center gap-2 rounded-[10px] bg-[#0f172b] px-4 py-3 text-sm font-bold text-white"
                  >
                    Recevoir mon coupon
                    <Mail className="h-4 w-4" />
                  </button>
                </div>
              )}

              {step === "done" && (
                <div>
                  <Mail className="h-7 w-7 text-[#6c00f6]" />
                  <h3 className="mt-4 text-xl font-bold tracking-[-0.03em] text-[#0f172b]">
                    Coupon envoyé par e-mail.
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#475569]">
                    Dans l’application réelle, le client reçoit un QR Code unique à présenter au
                    personnel. Le retrait ne peut être validé qu’une seule fois.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("intro");
                      setFirstName("");
                      setEmail("");
                      setRotation(16);
                    }}
                    className="mt-5 inline-flex items-center gap-2 rounded-[10px] border border-[#dbe3ef] bg-white px-4 py-3 text-sm font-bold text-[#0f172b]"
                  >
                    Rejouer la démo
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-[1fr_0.9fr]">
            <div className="rounded-[20px] border border-[#e5e7eb] bg-white p-5 shadow-[0_0_24px_rgba(55,65,81,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7f22fe]">
                Affiche A4
              </p>
              <div className="mt-4 rounded-[16px] bg-[#f1f5f9] p-4">
                <div className="mx-auto grid h-28 w-28 grid-cols-7 gap-1 rounded-[12px] border-4 border-white bg-white p-2 shadow-sm">
                  {Array.from({ length: 49 }).map((_, index) => (
                    <span
                      key={index}
                      className="rounded-[1px]"
                      style={{
                        backgroundColor:
                          [0, 1, 3, 6, 8, 10, 12, 14, 18, 20, 21, 24, 26, 28, 30, 33, 35, 38, 40, 42, 45, 47, 48].includes(index)
                            ? "#0f172b"
                            : "transparent",
                      }}
                    />
                  ))}
                </div>
                <div className="mx-auto mt-4 w-fit rounded-[8px] bg-[#6c00f6] px-4 py-2 text-xs font-bold text-white">
                  SCANNEZ POUR JOUER
                </div>
              </div>
            </div>
            <div className="rounded-[20px] border border-[#e5e7eb] bg-[#0f172b] p-5 text-white shadow-[0_0_24px_rgba(55,65,81,0.10)]">
              <p className="text-sm font-medium text-white/60">Workflow terrain</p>
              <div className="mt-5 space-y-4">
                {["Scanner", "Jouer", "Récupérer"].map((item, index) => (
                  <div key={item} className="flex items-center gap-3">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-xs font-bold text-[#6c00f6]">
                      {index + 1}
                    </span>
                    <span className="text-sm font-semibold">{item}</span>
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

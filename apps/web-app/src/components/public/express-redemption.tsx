"use client";

import { Check, ChevronRight, CircleAlert, LockKeyhole, ShieldCheck } from "lucide-react";
import { useRef, useState } from "react";

import { CashierRedemptionContext, PublicRedemptionContext } from "@/lib/types";

type ExpressRedemptionProps = {
  code: string;
  context: PublicRedemptionContext;
};

type Phase = "ready" | "pin" | "confirm" | "redeemed";

function formatDateTime(value?: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusContent(status: CashierRedemptionContext["status"]) {
  switch (status) {
    case "redeemed":
      return { label: "Lot déjà retiré", tone: "border-[#f2c8c8] bg-[#fff5f5] text-[#8f1d1d]" };
    case "expired":
      return { label: "Lot expiré", tone: "border-[#f0dfaa] bg-[#fff9e8] text-[#74570b]" };
    case "not_available":
      return { label: "Lot pas encore disponible", tone: "border-[#f0dfaa] bg-[#fff9e8] text-[#74570b]" };
    case "available":
      return { label: "Lot disponible", tone: "border-[#b7e4c7] bg-[#f0fbf3] text-[#126b40]" };
    default:
      return { label: "Code de retrait invalide", tone: "border-[#f2c8c8] bg-[#fff5f5] text-[#8f1d1d]" };
  }
}

export function ExpressRedemption({ code, context: initialContext }: ExpressRedemptionProps) {
  const pinInputRef = useRef<HTMLInputElement>(null);
  const [context, setContext] = useState<PublicRedemptionContext>(initialContext);
  const [phase, setPhase] = useState<Phase>(initialContext.status === "available" ? "ready" : "confirm");
  const [pin, setPin] = useState("");
  const [purchaseConfirmed, setPurchaseConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = statusContent(context.status);
  const isAvailable = context.status === "available";

  function openMerchantValidation() {
    setError(null);
    setPhase("pin");
    window.setTimeout(() => pinInputRef.current?.focus(), 0);
  }

  async function submitPin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{4,6}$/.test(pin)) {
      setError("Saisissez le PIN commerçant à 4 à 6 chiffres.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/public/redeem/${encodeURIComponent(code)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "authorize", pin }),
      });
      const payload = (await response.json().catch(() => null)) as { context?: PublicRedemptionContext; error?: string } | null;
      if (!response.ok || !payload?.context) throw new Error(payload?.error ?? "Autorisation impossible.");
      setContext(payload.context);
      setPhase("confirm");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Autorisation impossible.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function redeem() {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/public/redeem/${encodeURIComponent(code)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "redeem",
          pin,
          purchaseConfirmed,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const payload = (await response.json().catch(() => null)) as { context?: PublicRedemptionContext; error?: string } | null;
      if (!response.ok || !payload?.context) throw new Error(payload?.error ?? "Le retrait n’a pas pu être validé.");
      setContext(payload.context);
      setPhase("redeemed");
    } catch (redeemError) {
      setError(redeemError instanceof Error ? redeemError.message : "Le retrait n’a pas pu être validé.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] px-4 py-6 text-[#182033] sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-[560px]">
        <header className="mb-5 flex items-center justify-between gap-4 px-1">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b28719]">Retrait sécurisé</p>
            <p className="mt-1 text-sm font-semibold text-[#526078]">
              {context.merchantName}
              {context.merchantCity ? ` · ${context.merchantCity}` : ""}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dbe4f0] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#667286]">
            <LockKeyhole className="h-3.5 w-3.5" /> HTTPS
          </span>
        </header>

        <section className="overflow-hidden rounded-[28px] border border-[#dbe4f0] bg-white shadow-[0_24px_70px_rgba(18,24,39,0.1)]">
          <div className="border-b border-[#edf0f4] bg-[linear-gradient(135deg,#fffdf5,#fff8e8)] px-5 py-5 sm:px-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b28719]">Validation du retrait</p>
                <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-[#111827]">{context.prizeLabel ?? "Lot"}</h1>
                <p className="mt-2 text-sm text-[#667286]">{context.campaignTitle}</p>
              </div>
              <span className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${status.tone}`}>{status.label}</span>
            </div>
          </div>

          <div className="space-y-5 px-5 py-5 sm:px-7 sm:py-7">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[18px] border border-[#e5ebf2] bg-[#fbfcfe] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8993a6]">Bénéficiaire</p>
                <p className="mt-2 text-sm font-semibold text-[#182033]">{context.firstName || "Client"}</p>
                {context.maskedEmail ? <p className="mt-1 text-xs text-[#7a8498]">{context.maskedEmail}</p> : null}
              </div>
              <div className="rounded-[18px] border border-[#e5ebf2] bg-[#fbfcfe] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8993a6]">Code</p>
                <p className="mt-2 font-mono text-lg font-semibold tracking-[0.08em] text-[#182033]">{context.redemptionCode ?? code}</p>
              </div>
            </div>

            {context.rewardAvailableAt || context.rewardExpiresAt ? (
              <div className="rounded-[18px] border border-[#e5ebf2] bg-[#fbfcfe] px-4 py-3 text-sm leading-6 text-[#667286]">
                {context.rewardAvailableAt ? <p>Disponible à partir du {formatDateTime(context.rewardAvailableAt)}</p> : null}
                {context.rewardExpiresAt ? <p>Valable jusqu’au {formatDateTime(context.rewardExpiresAt)}</p> : null}
              </div>
            ) : null}

            {context.prizeUsageConditions ? (
              <div className="rounded-[18px] border border-[#f0dfaa] bg-[#fff9e8] px-4 py-3 text-sm leading-6 text-[#6c5313]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a6a18]">Conditions de retrait</p>
                <p className="mt-1 whitespace-pre-line">{context.prizeUsageConditions}</p>
              </div>
            ) : null}

            {isAvailable ? (
              <div className="rounded-[18px] border border-[#dbe4f0] bg-[#f8fafc] px-4 py-3 text-sm leading-6 text-[#667286]">
                <p className="font-semibold text-[#182033]">Ce lot est réservé à ce client.</p>
                <p className="mt-1">La validation finale est réservée au commerçant présent lors de la remise.</p>
              </div>
            ) : null}

            {phase === "ready" && isAvailable ? (
              <button type="button" onClick={openMerchantValidation} className="inline-flex w-full items-center justify-center gap-2 rounded-[16px] bg-[#111827] px-5 py-4 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(17,24,39,0.16)] transition hover:bg-[#273142]">
                <ShieldCheck className="h-4 w-4" /> Valider en tant que commerçant <ChevronRight className="h-4 w-4" />
              </button>
            ) : null}

            {phase === "pin" ? (
              <form onSubmit={submitPin} className="rounded-[20px] border border-[#dbe4f0] bg-[#f8fafc] p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff3c9] text-[#9a7210]"><LockKeyhole className="h-4 w-4" /></span>
                  <div><p className="text-sm font-semibold text-[#182033]">Accès commerçant</p><p className="mt-1 text-xs leading-5 text-[#667286]">Ce contrôle est réservé au personnel du commerce. Demandez le PIN à un responsable si nécessaire.</p></div>
                </div>
                <label className="mt-4 block text-sm font-semibold text-[#182033]" htmlFor="redemption-pin">PIN commerçant</label>
                <input ref={pinInputRef} id="redemption-pin" type="password" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))} placeholder="4 à 6 chiffres" className="mt-2 w-full rounded-[14px] border border-[#cfd9e6] bg-white px-4 py-3.5 text-center font-mono text-xl tracking-[0.28em] text-[#111827] outline-none focus:border-[#b28719] focus:ring-4 focus:ring-[#f4c14a]/20" />
                <div className="mt-4 flex flex-col gap-2 sm:flex-row"><button type="submit" disabled={isSubmitting} className="inline-flex flex-1 items-center justify-center gap-2 rounded-[14px] bg-[#b28719] px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-50">{isSubmitting ? "Vérification…" : "Continuer"}<ChevronRight className="h-4 w-4" /></button><button type="button" onClick={() => { setPhase("ready"); setError(null); }} className="rounded-[14px] border border-[#d6dfeb] bg-white px-4 py-3.5 text-sm font-semibold text-[#526078]">Retour</button></div>
              </form>
            ) : null}

            {phase === "confirm" && isAvailable ? (
              <div className="rounded-[20px] border border-[#b7e4c7] bg-[#f0fbf3] p-4 sm:p-5">
                <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#dff6e7] text-[#16834c]"><ShieldCheck className="h-4 w-4" /></span><div><p className="text-sm font-semibold text-[#126b40]">Commerçant identifié</p><p className="mt-1 text-xs leading-5 text-[#39785a]">Vérifiez une dernière fois le lot avant d’enregistrer sa remise.</p></div></div>
                {context.purchaseRequired ? <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-[14px] border border-[#f0dfaa] bg-[#fff9e8] p-3 text-sm text-[#5f4b12]"><input type="checkbox" checked={purchaseConfirmed} onChange={(event) => setPurchaseConfirmed(event.target.checked)} className="mt-1 h-4 w-4 accent-[#b28719]" /><span><span className="block font-semibold">Achat vérifié</span><span className="mt-1 block text-xs leading-5 text-[#806b30]">Cette campagne exige un achat pour remettre le lot.</span></span></label> : null}
                <button type="button" onClick={() => void redeem()} disabled={isSubmitting || (Boolean(context.purchaseRequired) && !purchaseConfirmed)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[16px] bg-[#111827] px-5 py-4 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(17,24,39,0.16)] disabled:cursor-not-allowed disabled:opacity-45">{isSubmitting ? "Validation…" : "VALIDER LE RETRAIT DU LOT"}<Check className="h-4 w-4" /></button>
              </div>
            ) : null}

            {phase === "redeemed" ? (
              <div className="rounded-[20px] border border-[#b7e4c7] bg-[#f0fbf3] p-5 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#dff6e7] text-[#16834c]"><Check className="h-6 w-6" /></span><h2 className="mt-3 text-xl font-semibold text-[#126b40]">Retrait enregistré</h2><p className="mt-2 text-sm leading-6 text-[#39785a]">Le lot peut maintenant être remis au client. Cette opération est enregistrée.</p><p className="mt-3 font-mono text-sm font-semibold tracking-[0.1em] text-[#126b40]">{context.redemptionCode ?? code}</p></div>
            ) : null}

            {error ? <div role="alert" className="flex items-start gap-2 rounded-[14px] border border-[#f2c8c8] bg-[#fff4f4] px-4 py-3 text-sm leading-6 text-[#a11a1a]"><CircleAlert className="mt-1 h-4 w-4 shrink-0" />{error}</div> : null}
          </div>
        </section>

        <p className="mt-4 px-2 text-center text-xs leading-5 text-[#8993a6]">Le client présente ce QR code. Seul le personnel du commerce peut confirmer le retrait avec le PIN commerçant.</p>
      </div>
    </main>
  );
}

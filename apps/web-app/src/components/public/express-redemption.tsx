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
  const [phase, setPhase] = useState<Phase>("ready");
  const [pin, setPin] = useState("");
  const [forceReason, setForceReason] = useState("");
  const [purchaseConfirmed, setPurchaseConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = statusContent(context.status);
  const isAvailable = context.status === "available";
  const canForce = context.status === "expired" || context.status === "not_available";

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
          forceRedemption: canForce,
          forceReason: canForce ? forceReason : undefined,
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
        {context.isPreview ? (
          <div
            role="status"
            className="mb-4 rounded-[16px] border border-[#9fb8ff] bg-[#eef2ff] px-4 py-3 text-center text-xs font-semibold leading-5 text-[#334477]"
          >
            Mode prévisualisation — ce retrait est simulé et n&apos;affecte pas le stock réel.
          </div>
        ) : null}
        <header className="mb-5 flex items-center justify-between gap-4 px-1">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b28719]">Retrait sécurisé</p>
            <p className="mt-1 text-sm font-semibold text-[#526078]">
              {context.merchantName}
              {context.merchantCity ? ` · ${context.merchantCity}` : ""}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dbe4f0] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#667286]">
            <LockKeyhole className="h-3.5 w-3.5" aria-label="Connexion sécurisée" />
          </span>
        </header>

        <section className="overflow-hidden rounded-[28px] border border-[#dbe4f0] bg-white shadow-[0_24px_70px_rgba(18,24,39,0.1)]">
          <div className="border-b border-[#edf0f4] bg-[linear-gradient(135deg,#fffdf5,#fff8e8)] px-5 py-5 sm:px-7">
            <div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b28719]">Validation du retrait</p>
                <h1 className="mt-2 w-full break-words font-display text-3xl font-semibold leading-tight tracking-[-0.04em] text-[#111827]">{context.prizeLabel ?? "Lot"}</h1>
                <p className="mt-2 text-sm text-[#667286]">{context.campaignTitle}</p>
              </div>
              <span className={`mt-3 inline-flex rounded-full border px-3 py-1.5 text-[11px] font-semibold ${status.tone}`}>{status.label}</span>
            </div>
          </div>

          <div className="space-y-5 px-5 py-5 sm:px-7 sm:py-7">
            {context.status === "not_available" ? (
              <div role="alert" className="flex items-start gap-3 rounded-[18px] border-2 border-[#e5b83e] bg-[#fff8dc] px-4 py-4 text-sm leading-6 text-[#74570b]">
                <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">Retrait pas encore disponible</p>
                  <p className="mt-1">Ce lot pourra être retiré à partir du {formatDateTime(context.rewardAvailableAt)}.</p>
                </div>
              </div>
            ) : context.status === "expired" ? (
              <div role="alert" className="flex items-start gap-3 rounded-[18px] border-2 border-[#e5b83e] bg-[#fff8dc] px-4 py-4 text-sm leading-6 text-[#74570b]">
                <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">Retrait impossible : période terminée</p>
                  <p className="mt-1">La validité de ce lot a pris fin le {formatDateTime(context.rewardExpiresAt)}.</p>
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[18px] border border-[#e5ebf2] bg-[#fbfcfe] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8993a6]">Bénéficiaire</p>
                <p className="mt-2 text-sm font-semibold text-[#182033]">{context.firstName || "Client"}</p>
                {context.email || context.maskedEmail ? <p className="mt-1 break-all text-xs text-[#7a8498]">{context.email ?? context.maskedEmail}</p> : null}
              </div>
              <div className="rounded-[18px] border border-[#e5ebf2] bg-[#fbfcfe] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8993a6]">Code</p>
                <p className="mt-2 font-mono text-lg font-semibold tracking-[0.08em] text-[#182033]">{context.redemptionCode ?? code}</p>
              </div>
            </div>

            {context.rewardAvailableAt || context.rewardExpiresAt ? (
              <div className="rounded-[18px] border border-[#e5ebf2] bg-[#fbfcfe] px-4 py-3 text-sm leading-6 text-[#667286]">
                {context.rewardAvailableAt ? <p>Disponible à partir du <strong className="font-semibold text-[#182033]">{formatDateTime(context.rewardAvailableAt)}</strong></p> : null}
                {context.rewardExpiresAt ? <p>Valable jusqu’au <strong className="font-semibold text-[#182033]">{formatDateTime(context.rewardExpiresAt)}</strong></p> : null}
              </div>
            ) : null}

            {context.prizeUsageConditions ? (
              <div className="rounded-[18px] border border-[#f0dfaa] bg-[#fff9e8] px-4 py-3 text-sm leading-6 text-[#6c5313]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a6a18]">Conditions de retrait</p>
                <p className="mt-1 whitespace-pre-line">{context.prizeUsageConditions}</p>
              </div>
            ) : null}

            {phase === "ready" && (isAvailable || canForce) ? (
              <button type="button" onClick={openMerchantValidation} className="inline-flex w-full items-center justify-center gap-2 rounded-[16px] bg-[#111827] px-5 py-4 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(17,24,39,0.16)] transition hover
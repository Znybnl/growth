"use client";

import { Check, ChevronRight, CircleAlert, Clock3, Keyboard, LockKeyhole, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { FormEvent, useRef, useState } from "react";

import { cashierStatusMessage, normalizeCashierCode } from "@/lib/cashier";
import { CashierRedemptionContext } from "@/lib/types";
import { Input } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/workspace";

function formatDateTime(value?: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusTone(status: CashierRedemptionContext["status"]) {
  if (status === "available") return { panel: "border-[color-mix(in_srgb,var(--okado-status-success-text)_24%,transparent)] bg-[var(--okado-status-success-bg)]", icon: "bg-[color-mix(in_srgb,var(--okado-status-success-text)_12%,white)] text-[var(--okado-status-success-text)]", text: "text-[var(--okado-status-success-text)]" };
  if (status === "redeemed") return { panel: "border-coral-alert/30 bg-coral-alert/10", icon: "bg-coral-alert/10 text-coral-alert", text: "text-coral-alert" };
  return { panel: "border-[color-mix(in_srgb,var(--okado-status-warning-text)_30%,transparent)] bg-[var(--okado-status-warning-bg)]", icon: "bg-[var(--okado-status-warning-bg)] text-[var(--okado-status-warning-text)]", text: "text-[var(--okado-status-warning-text)]" };
}

type ResultCardProps = {
  context: CashierRedemptionContext;
  justRedeemed: boolean;
  purchaseConfirmed: boolean;
  isRedeeming: boolean;
  forceReason: string;
  onPurchaseConfirmedChange: (value: boolean) => void;
  onForceReasonChange: (value: string) => void;
  onRedeem: (forceRedemption?: boolean) => void;
  onReset: () => void;
};

function ResultCard({
  context,
  justRedeemed,
  purchaseConfirmed,
  isRedeeming,
  forceReason,
  onPurchaseConfirmedChange,
  onForceReasonChange,
  onRedeem,
  onReset,
}: ResultCardProps) {
  const tone = justRedeemed ? statusTone("available") : statusTone(context.status);
  const isAvailable = context.status === "available";
  const isRedeemed = context.status === "redeemed";
  const canForce = context.status === "expired" || context.status === "not_available";

  return (
    <section className="okado-card okado-cashier overflow-hidden" aria-live="polite">
      <div className={`border-b px-5 py-4 sm:px-7 ${tone.panel}`}>
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 items-center justify-center rounded-full ${tone.icon}`}>
            {justRedeemed ? <Check className="h-5 w-5" /> : isAvailable ? <ShieldCheck className="h-5 w-5" /> : isRedeemed ? <CircleAlert className="h-5 w-5" /> : <Clock3 className="h-5 w-5" />}
          </span>
          <div>
            <p className={`text-sm font-semibold ${tone.text}`}>{justRedeemed ? "Retrait confirmé" : isAvailable ? "Gain valide" : cashierStatusMessage(context.status)}</p>
            <p className="mt-0.5 text-xs text-ash">{context.redemptionCode}</p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-ash">Lot à remettre</p>
            <h2 className="okado-section-title mt-2">{context.prizeLabel}</h2>
            <p className="mt-2 text-sm text-ash">À {context.firstName} · {context.maskedEmail}</p>
          </div>
          <div className="rounded-[var(--okado-radius-control)] bg-[var(--okado-surface-muted)] px-4 py-3 text-right">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ash">Campagne</p>
            <p className="mt-1 max-w-[190px] text-sm font-semibold text-carbon">{context.campaignTitle}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[var(--okado-radius-control)] bg-soft-white p-4"><p className="text-[10px] uppercase tracking-[0.2em] text-ash">Disponibilité</p><p className="mt-2 text-sm font-semibold text-carbon">{context.rewardAvailableAt ? formatDateTime(context.rewardAvailableAt) : "Dès maintenant"}</p></div>
          <div className="rounded-[var(--okado-radius-control)] bg-soft-white p-4"><p className="text-[10px] uppercase tracking-[0.2em] text-ash">Expiration</p><p className="mt-2 text-sm font-semibold text-carbon">{context.rewardExpiresAt ? formatDateTime(context.rewardExpiresAt) : "Sans date limite"}</p></div>
        </div>

        {context.prizeUsageConditions ? <div className="mt-4 rounded-[var(--okado-radius-control)] border border-[color-mix(in_srgb,var(--okado-status-warning-text)_30%,transparent)] bg-[var(--okado-status-warning-bg)] p-4 text-sm leading-6 text-[var(--okado-status-warning-text)]"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--okado-status-warning-text)]">Conditions d’utilisation</p><p className="mt-2 whitespace-pre-line">{context.prizeUsageConditions}</p></div> : null}

        {isAvailable ? (
          <div className="mt-6 border-t border-fog pt-5">
            <p className="text-sm font-semibold text-carbon">Dernière vérification</p>
            <p className="mt-1 text-xs leading-5 text-ash">Confirmez la remise avec le client devant vous. Cette action sera enregistrée au nom de l’opérateur connecté.</p>
            {context.purchaseRequired ? <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-[12px] border border-[color-mix(in_srgb,var(--okado-status-warning-text)_30%,transparent)] bg-[var(--okado-status-warning-bg)] p-4"><input type="checkbox" checked={purchaseConfirmed} onChange={(event) => onPurchaseConfirmedChange(event.target.checked)} className="mt-1 h-4 w-4 accent-aubergine" /><span><span className="block text-sm font-semibold text-[var(--okado-status-warning-text)]">Achat vérifié par l’équipe</span><span className="mt-1 block text-xs leading-5 text-[var(--okado-status-warning-text)]">Ce lot exige un achat pour être remis.</span></span></label> : null}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row"><button type="button" onClick={() => onRedeem(false)} disabled={isRedeeming || (Boolean(context.purchaseRequired) && !purchaseConfirmed)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-[4px] bg-aubergine px-5 py-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(97,31,105,0.18)] transition hover:bg-deep-plum disabled:cursor-not-allowed disabled:opacity-45">{isRedeeming ? "Validation…" : "Valider le retrait"}<ChevronRight className="h-4 w-4" /></button><button type="button" onClick={onReset} className="rounded-[4px] border border-fog bg-white px-5 py-4 text-sm font-semibold text-charcoal transition hover:border-lavender-mist hover:bg-purple-haze">Annuler</button></div>
          </div>
        ) : canForce ? (
          <div className="mt-6 border-t border-fog pt-5">
            <div className="rounded-[12px] border border-[color-mix(in_srgb,var(--okado-status-warning-text)_30%,transparent)] bg-[var(--okado-status-warning-bg)] p-4 text-sm leading-6 text-[var(--okado-status-warning-text)]">
              <p className="font-semibold">Retrait hors période</p>
              <p className="mt-1">Le retrait normal est bloqué car le lot est {context.status === "expired" ? "expiré" : "pas encore disponible"}. Un responsable peut exceptionnellement forcer la remise ; l’opération sera journalisée.</p>
            </div>
            <label className="mt-4 block text-sm font-semibold text-carbon" htmlFor="cashier-force-reason">Motif du forçage</label>
            <textarea id="cashier-force-reason" value={forceReason} onChange={(event) => onForceReasonChange(event.target.value)} maxLength={500} rows={3} placeholder="Ex. Accord exceptionnel du responsable" className="mt-2 w-full resize-none rounded-[12px] border border-fog bg-white px-4 py-3 text-sm text-carbon outline-none focus:border-aubergine focus:ring-4 focus:ring-aubergine/15" />
            {context.purchaseRequired ? <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-[12px] border border-[color-mix(in_srgb,var(--okado-status-warning-text)_30%,transparent)] bg-[var(--okado-status-warning-bg)] p-4"><input type="checkbox" checked={purchaseConfirmed} onChange={(event) => onPurchaseConfirmedChange(event.target.checked)} className="mt-1 h-4 w-4 accent-aubergine" /><span><span className="block text-sm font-semibold text-[var(--okado-status-warning-text)]">Achat vérifié par l’équipe</span><span className="mt-1 block text-xs leading-5 text-[var(--okado-status-warning-text)]">Ce lot exige un achat pour être remis.</span></span></label> : null}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row"><button type="button" onClick={() => onRedeem(true)} disabled={isRedeeming || forceReason.trim().length < 8 || (Boolean(context.purchaseRequired) && !purchaseConfirmed)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-[4px] bg-aubergine px-5 py-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(97,31,105,0.18)] transition hover:bg-deep-plum disabled:cursor-not-allowed disabled:opacity-45">{isRedeeming ? "Validation…" : "Forcer et valider le retrait"}<ChevronRight className="h-4 w-4" /></button><button type="button" onClick={onReset} className="rounded-[4px] border border-fog bg-white px-5 py-4 text-sm font-semibold text-charcoal transition hover:border-lavender-mist hover:bg-purple-haze">Annuler</button></div>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-3 border-t border-fog pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm leading-6 text-ash">{isRedeemed && context.redeemedAt ? `Retrait enregistré le ${formatDateTime(context.redeemedAt)}.` : cashierStatusMessage(context.status)}</p><button type="button" onClick={onReset} className="inline-flex items-center justify-center gap-2 rounded-[4px] border border-fog bg-white px-4 py-3 text-sm font-semibold text-charcoal transition hover:border-lavender-mist hover:bg-purple-haze"><RotateCcw className="h-4 w-4" />Nouveau retrait</button></div>
        )}
      </div>
    </section>
  );
}

export function CashierScreen() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [context, setContext] = useState<CashierRedemptionContext | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [purchaseConfirmed, setPurchaseConfirmed] = useState(false);
  const [forceReason, setForceReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [justRedeemed, setJustRedeemed] = useState(false);

  function reset() {
    setContext(null);
    setError(null);
    setSuccess(null);
    setJustRedeemed(false);
    setPurchaseConfirmed(false);
    setForceReason("");
    setCode("");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function lookup(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const normalizedCode = normalizeCashierCode(code);
    if (!normalizedCode) {
      setError("Saisissez ou scannez un code de retrait.");
      inputRef.current?.focus();
      return;
    }

    setIsLookingUp(true);
    setError(null);
    setSuccess(null);
    setJustRedeemed(false);
    setContext(null);
    setCode(normalizedCode);
    try {
      const response = await fetch("/api/merchant/cashier/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: normalizedCode }) });
      const payload = (await response.json().catch(() => null)) as { context?: CashierRedemptionContext; error?: string } | null;
      if (!response.ok || !payload?.context) throw new Error(payload?.error ?? "Code introuvable.");
      setContext(payload.context);
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : "Recherche impossible.");
    } finally {
      setIsLookingUp(false);
    }
  }

  async function redeem(forceRedemption = false) {
    if (!context?.leadId) return;
    setIsRedeeming(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/merchant/cashier/redeem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: context.leadId, purchaseConfirmed, forceRedemption, forceReason: forceRedemption ? forceReason.trim() : undefined, idempotencyKey: crypto.randomUUID() }) });
      const payload = (await response.json().catch(() => null)) as { context?: CashierRedemptionContext; error?: string } | null;
      if (!response.ok || !payload?.context) throw new Error(payload?.error ?? "Le retrait n’a pas pu être validé.");
      setContext(payload.context);
      setJustRedeemed(true);
      setSuccess(forceRedemption ? "Retrait hors période enregistré. Le motif a été journalisé." : "Retrait enregistré. Le lot peut être remis au client.");
    } catch (redeemError) {
      setError(redeemError instanceof Error ? redeemError.message : "Le retrait n’a pas pu être validé.");
    } finally {
      setIsRedeeming(false);
    }
  }

  return (
    <div className="okado-cashier-page w-full space-y-6 pb-10">
      <PageHeader eyebrow="Retrait" title="Validez un retrait" description="Saisissez le code de retrait ici pour ouvrir la page de validation. Une seule confirmation suffit, chaque retrait est journalisé." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]"><main className="space-y-5">{!context ? <section className="okado-card okado-cashier p-6 sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="okado-label">Nouveau retrait</p><h2 className="okado-section-title mt-2">Présentez ou saisissez le code</h2><p className="mt-2 text-sm leading-6 text-ash">Le code est généralement au format OK-XXXXXXXX et figure dans l’e-mail du gagnant.</p></div><div className="hidden rounded-[4px] bg-purple-haze p-3 text-aubergine sm:block"><Keyboard className="h-5 w-5" /></div></div><form onSubmit={lookup} className="mt-7"><label htmlFor="cashier-code" className="text-sm font-semibold text-graphite">Code de retrait</label><div className="mt-3 flex flex-col gap-3 sm:flex-row"><Input ref={inputRef} id="cashier-code" autoFocus value={code} onChange={(event) => setCode(event.target.value)} placeholder="Ex. OK-AB12CD34" autoComplete="off" spellCheck={false} className="min-w-0 flex-1 font-mono text-lg tracking-[0.08em]" /><button type="submit" disabled={isLookingUp} className="okado-filled-action gap-2 px-6 text-sm disabled:opacity-50">{isLookingUp ? "Recherche…" : "Vérifier"}<ChevronRight className="h-4 w-4" /></button></div></form>{error ? <div role="alert" className="mt-5 flex items-start gap-3 rounded-[var(--okado-radius-control)] border border-[#f2c8c8] bg-[#fff4f4] px-4 py-3 text-sm leading-6 text-[#a11a1a]"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{error}</div> : null}</section> : <ResultCard context={context} justRedeemed={justRedeemed} purchaseConfirmed={purchaseConfirmed} isRedeeming={isRedeeming} forceReason={forceReason} onPurchaseConfirmedChange={setPurchaseConfirmed} onForceReasonChange={setForceReason} onRedeem={(force) => void redeem(force)} onReset={reset} />}{success ? <div role="status" className="flex items-center gap-3 rounded-[18px] border border-[#b7e4c7] bg-[#f0fbf3] px-4 py-3 text-sm font-semibold text-[#126b40]"><Check className="h-5 w-5" />{success}<button type="button" onClick={reset} className="ml-auto rounded-[10px] bg-white px-3 py-2 text-xs text-[#126b40]">Nouveau</button></div> : null}</main><aside className="space-y-4"><section className="rounded-[16px] border border-[#e2e8f0] bg-white p-5 shadow-[0_14px_32px_rgba(18,24,39,0.04)]"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-aubergine" /><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a8498]">Routine caisse</p></div><ol className="mt-4 space-y-4 text-sm text-[#526078]"><li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-aubergine text-xs font-semibold text-white">1</span><span>Saisir le code.</span></li><li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-aubergine text-xs font-semibold text-white">2</span><span>Vérifier le lot et les conditions.</span></li><li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-haze text-xs font-semibold text-aubergine">3</span><span>Valider une seule fois.</span></li></ol></section><section className="rounded-[16px] border border-[#e2e8f0] bg-[#fbfcfe] p-5"><div className="flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-[#526078]" /><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a8498]">Sécurité</p></div><p className="mt-3 text-sm leading-6 text-[#667286]">Le retrait est limité à votre commerce et enregistré avec votre compte opérateur.</p></section></aside></div>
    </div>
  );
}

"use client";

import { Check, ChevronRight, CircleAlert, Clock3, Keyboard, LockKeyhole, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { FormEvent, useRef, useState } from "react";

import { cashierStatusMessage, normalizeCashierCode } from "@/lib/cashier";
import { CashierRedemptionContext } from "@/lib/types";

function formatDateTime(value?: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusTone(status: CashierRedemptionContext["status"]) {
  if (status === "available") return { panel: "border-[#b7e4c7] bg-[#f0fbf3]", icon: "bg-[#dff6e7] text-[#16834c]", text: "text-[#126b40]" };
  if (status === "redeemed") return { panel: "border-[#f2c8c8] bg-[#fff5f5]", icon: "bg-[#ffe3e3] text-[#a11a1a]", text: "text-[#8f1d1d]" };
  return { panel: "border-[#f0dfaa] bg-[#fff9e8]", icon: "bg-[#fff0c2] text-[#9a7210]", text: "text-[#74570b]" };
}

function ResultCard({
  context,
  justRedeemed,
  purchaseConfirmed,
  isRedeeming,
  onPurchaseConfirmedChange,
  onRedeem,
  onReset,
}: {
  context: CashierRedemptionContext;
  justRedeemed: boolean;
  purchaseConfirmed: boolean;
  isRedeeming: boolean;
  onPurchaseConfirmedChange: (value: boolean) => void;
  onRedeem: () => void;
  onReset: () => void;
}) {
  const tone = justRedeemed ? statusTone("available") : statusTone(context.status);
  const isAvailable = context.status === "available";
  const isRedeemed = context.status === "redeemed";

  return (
    <section className="overflow-hidden rounded-[30px] border border-[#dfe7f0] bg-white shadow-[0_20px_55px_rgba(18,24,39,0.08)]" aria-live="polite">
      <div className={`border-b px-5 py-4 sm:px-7 ${tone.panel}`}>
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 items-center justify-center rounded-full ${tone.icon}`}>
            {justRedeemed ? <Check className="h-5 w-5" /> : isAvailable ? <ShieldCheck className="h-5 w-5" /> : isRedeemed ? <CircleAlert className="h-5 w-5" /> : <Clock3 className="h-5 w-5" />}
          </span>
          <div>
            <p className={`text-sm font-semibold ${tone.text}`}>{justRedeemed ? "Retrait confirmé" : isAvailable ? "Gain valide" : cashierStatusMessage(context.status)}</p>
            <p className="mt-0.5 text-xs text-[#68758a]">{context.redemptionCode}</p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-[#8993a6]">Lot à remettre</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#111827]">{context.prizeLabel}</h2>
            <p className="mt-2 text-sm text-[#667286]">À {context.firstName} · {context.maskedEmail}</p>
          </div>
          <div className="rounded-[18px] bg-[#f7f9fc] px-4 py-3 text-right">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#8993a6]">Campagne</p>
            <p className="mt-1 max-w-[190px] text-sm font-semibold text-[#182033]">{context.campaignTitle}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[18px] border border-[#e5ebf2] bg-[#fbfcfe] p-4"><p className="text-[10px] uppercase tracking-[0.2em] text-[#8993a6]">Disponibilité</p><p className="mt-2 text-sm font-semibold text-[#182033]">{context.rewardAvailableAt ? formatDateTime(context.rewardAvailableAt) : "Dès maintenant"}</p></div>
          <div className="rounded-[18px] border border-[#e5ebf2] bg-[#fbfcfe] p-4"><p className="text-[10px] uppercase tracking-[0.2em] text-[#8993a6]">Expiration</p><p className="mt-2 text-sm font-semibold text-[#182033]">{context.rewardExpiresAt ? formatDateTime(context.rewardExpiresAt) : "Sans date limite"}</p></div>
        </div>

        {context.prizeUsageConditions ? <div className="mt-4 rounded-[18px] border border-[#f0dfaa] bg-[#fff9e8] p-4 text-sm leading-6 text-[#6c5313]"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a6a18]">Conditions d’utilisation</p><p className="mt-2 whitespace-pre-line">{context.prizeUsageConditions}</p></div> : null}

        {isAvailable ? <div className="mt-6 border-t border-[#edf0f4] pt-5"><p className="text-sm font-semibold text-[#182033]">Dernière vérification</p><p className="mt-1 text-xs leading-5 text-[#7a8498]">Confirmez la remise avec le client devant vous. Cette action sera enregistrée au nom de l’opérateur connecté.</p>{context.purchaseRequired ? <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-[16px] border border-[#f0dfaa] bg-[#fff9e8] p-4"><input type="checkbox" checked={purchaseConfirmed} onChange={(event) => onPurchaseConfirmedChange(event.target.checked)} className="mt-1 h-4 w-4 accent-[#b28719]" /><span><span className="block text-sm font-semibold text-[#5f4b12]">Achat vérifié par l’équipe</span><span className="mt-1 block text-xs leading-5 text-[#806b30]">Cette campagne exige un achat pour remettre le lot.</span></span></label> : null}<div className="mt-5 flex flex-col gap-3 sm:flex-row"><button type="button" onClick={onRedeem} disabled={isRedeeming || (Boolean(context.purchaseRequired) && !purchaseConfirmed)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-[16px] bg-[#111827] px-5 py-4 text-sm font-semibold text-white shadow-[0_12px_25px_rgba(17,24,39,0.16)] transition hover:bg-[#263149] disabled:cursor-not-allowed disabled:opacity-45">{isRedeeming ? "Validation…" : "Valider le retrait"}<ChevronRight className="h-4 w-4" /></button><button type="button" onClick={onReset} className="rounded-[16px] border border-[#d6dfeb] bg-white px-5 py-4 text-sm font-semibold text-[#526078]">Annuler</button></div></div> : <div className="mt-6 flex flex-col gap-3 border-t border-[#edf0f4] pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm leading-6 text-[#667286]">{isRedeemed && context.redeemedAt ? `Retrait enregistré le ${formatDateTime(context.redeemedAt)}.` : cashierStatusMessage(context.status)}</p><button type="button" onClick={onReset} className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-[#d6dfeb] bg-white px-4 py-3 text-sm font-semibold text-[#526078]"><RotateCcw className="h-4 w-4" />Nouveau retrait</button></div>}
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [justRedeemed, setJustRedeemed] = useState(false);

  function reset() {
    setContext(null);
    setError(null);
    setSuccess(null);
    setJustRedeemed(false);
    setPurchaseConfirmed(false);
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

  async function redeem() {
    if (!context?.leadId) return;
    setIsRedeeming(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/merchant/cashier/redeem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: context.leadId, purchaseConfirmed, idempotencyKey: crypto.randomUUID() }) });
      const payload = (await response.json().catch(() => null)) as { context?: CashierRedemptionContext; error?: string } | null;
      if (!response.ok || !payload?.context) throw new Error(payload?.error ?? "Le retrait n’a pas pu être validé.");
      setContext(payload.context);
      setJustRedeemed(true);
      setSuccess("Retrait enregistré. Le lot peut être remis au client.");
    } catch (redeemError) {
      setError(redeemError instanceof Error ? redeemError.message : "Le retrait n’a pas pu être validé.");
    } finally {
      setIsRedeeming(false);
    }
  }

  return (
    <div className="w-full space-y-6 pb-10">
      <section className="flex flex-col gap-5 px-1 py-2">
        <div>
          <p className="okado-label">Retrait</p>
          <h1 className="okado-page-title mt-3">Validez un retrait</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-ash">
            Saisissez le code de retrait ici pour ouvrir la page de validation. Une seule confirmation suffit, chaque retrait est journalisé.
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <main className="space-y-5">
          {!context ? <section className="rounded-[30px] border border-[#dfe7f0] bg-white p-6 shadow-[0_18px_48px_rgba(18,24,39,0.06)] sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b28719]">Nouveau retrait</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#111827]">Présentez ou saisissez le code</h2><p className="mt-2 text-sm leading-6 text-[#667286]">Le code est généralement au format OK-XXXXXXXX et figure dans l’e-mail du gagnant.</p></div><div className="hidden rounded-full bg-[#fff7dd] p-3 text-[#b28719] sm:block"><Keyboard className="h-5 w-5" /></div></div><form onSubmit={lookup} className="mt-7"><label htmlFor="cashier-code" className="text-sm font-semibold text-[#182033]">Code de retrait</label><div className="mt-3 flex flex-col gap-3 sm:flex-row"><input ref={inputRef} id="cashier-code" autoFocus value={code} onChange={(event) => setCode(event.target.value)} placeholder="Ex. OK-AB12CD34" autoComplete="off" spellCheck={false} className="min-w-0 flex-1 rounded-[18px] border border-[#cfd9e6] bg-[#fbfcfe] px-5 py-4 font-mono text-lg tracking-[0.08em] text-[#111827] outline-none transition focus:border-[#b28719] focus:ring-4 focus:ring-[#f4c14a]/15" /><button type="submit" disabled={isLookingUp} className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-[#111827] px-6 py-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(17,24,39,0.14)] disabled:opacity-50">{isLookingUp ? "Recherche…" : "Vérifier"}<ChevronRight className="h-4 w-4" /></button></div></form>{error ? <div role="alert" className="mt-5 flex items-start gap-3 rounded-[16px] border border-[#f2c8c8] bg-[#fff4f4] px-4 py-3 text-sm leading-6 text-[#a11a1a]"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{error}</div> : null}</section> : <ResultCard context={context} justRedeemed={justRedeemed} purchaseConfirmed={purchaseConfirmed} isRedeeming={isRedeeming} onPurchaseConfirmedChange={setPurchaseConfirmed} onRedeem={() => void redeem()} onReset={reset} />}
          {success ? <div role="status" className="flex items-center gap-3 rounded-[18px] border border-[#b7e4c7] bg-[#f0fbf3] px-4 py-3 text-sm font-semibold text-[#126b40]"><Check className="h-5 w-5" />{success}<button type="button" onClick={reset} className="ml-auto rounded-[10px] bg-white px-3 py-2 text-xs text-[#126b40]">Nouveau</button></div> : null}
        </main>

        <aside className="space-y-4"><section className="rounded-[26px] border border-[#e2e8f0] bg-white p-5 shadow-[0_14px_32px_rgba(18,24,39,0.04)]"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#b28719]" /><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a8498]">Routine caisse</p></div><ol className="mt-4 space-y-4 text-sm text-[#526078]"><li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#111827] text-xs font-semibold text-white">1</span><span>Saisir le code.</span></li><li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#111827] text-xs font-semibold text-white">2</span><span>Vérifier le lot et les conditions.</span></li><li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f4c14a] text-xs font-semibold text-[#111827]">3</span><span>Valider une seule fois.</span></li></ol></section><section className="rounded-[26px] border border-[#e2e8f0] bg-[#fbfcfe] p-5"><div className="flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-[#526078]" /><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a8498]">Sécurité</p></div><p className="mt-3 text-sm leading-6 text-[#667286]">Le retrait est limité à votre commerce et enregistré avec votre compte opérateur.</p></section></aside>
      </div>
    </div>
  );
}

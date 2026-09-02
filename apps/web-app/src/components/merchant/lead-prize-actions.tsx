"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { LeadStatus, RewardEmailDelivery } from "@/lib/types";

type LeadPrizeActionsProps = {
  leadId: string;
  status: LeadStatus;
  hasPrize: boolean;
  isExpired?: boolean;
  emailDeliveryStatus?: RewardEmailDelivery["status"];
};

export function LeadPrizeActions({
  leadId,
  status,
  hasPrize,
  isExpired = false,
  emailDeliveryStatus,
}: LeadPrizeActionsProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [resendLocked, setResendLocked] = useState(false);

  if (!hasPrize) {
    return <span className="text-sm text-[#7b8496]">Aucun lot</span>;
  }

  async function submit(action: "redeem" | "reset") {
    setIsPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/merchant/leads/${leadId}/${action}`, {
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Action impossible");
      }

      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Action impossible");
    } finally {
      setIsPending(false);
    }
  }

  async function resendEmail() {
    setIsResending(true);
    setError(null);
    setEmailMessage(null);

    try {
      const response = await fetch(`/api/merchant/leads/${leadId}/resend-email`, {
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Renvoi impossible");
      }

      setEmailMessage("E-mail renvoyé.");
      setResendLocked(true);
      window.dispatchEvent(new CustomEvent("merchant-alerts-refresh"));
      router.refresh();
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : "Renvoi impossible");
    } finally {
      setIsResending(false);
    }
  }

  const cooldownActive = resendLocked;
  const resendDisabled =
    status === "redeemed" || isResending || emailDeliveryStatus === "queued" || cooldownActive;
  const actionButtonClassName =
    "inline-flex h-10 w-[150px] items-center justify-center rounded-[4px] px-3 text-xs font-semibold leading-tight transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-45";

  return (
    <div className="min-w-[250px] space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => submit("redeem")}
          disabled={isPending || status === "redeemed" || isExpired}
          title={isExpired ? "Lot expiré" : undefined}
          className={`${actionButtonClassName} bg-aubergine text-white`}
        >
          Marquer récupéré
        </button>
        <button
          type="button"
          onClick={() => submit("reset")}
          disabled={isPending || status === "claimed"}
          className={`${actionButtonClassName} border border-[#d7e0ed] bg-white text-[#182033]`}
        >
          Réinitialiser
        </button>
        <button
          type="button"
          onClick={resendEmail}
          disabled={resendDisabled}
          title={status === "redeemed" ? "Lot déjà récupéré" : undefined}
          className={`${actionButtonClassName} bg-aubergine text-white`}
        >
          {isResending ? "Renvoi..." : cooldownActive ? "Patientez 2 min" : "Renvoyer e-mail"}
        </button>
      </div>

      {emailMessage ? <p className="text-xs font-semibold text-[#1f7d53]">{emailMessage}</p> : null}
      {!emailMessage && cooldownActive ? (
        <p className="text-xs text-[#7b8496]">Le dernier e-mail vient d&apos;être envoyé.</p>
      ) : null}
      {error ? <p className="text-xs font-semibold text-[#c2410c]">{error}</p> : null}
    </div>
  );
}

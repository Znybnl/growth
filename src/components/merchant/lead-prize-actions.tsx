"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { leadStatusLabel, rewardEmailStatusLabel } from "@/lib/format";
import { LeadStatus, RewardEmailDelivery, RewardEmailEvent } from "@/lib/types";

type LeadPrizeActionsProps = {
  leadId: string;
  status: LeadStatus;
  hasPrize: boolean;
  emailDeliveryStatus?: RewardEmailDelivery["status"];
  emailSentAt?: string;
  compact?: boolean;
};

type LeadEmailHistoryResponse = {
  delivery: RewardEmailDelivery | null;
  events: RewardEmailEvent[];
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function LeadPrizeActions({
  leadId,
  status,
  hasPrize,
  emailDeliveryStatus,
  compact = false,
}: LeadPrizeActionsProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [emailHistory, setEmailHistory] = useState<LeadEmailHistoryResponse | null>(null);
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

  async function loadHistory(forceOpen = true) {
    setError(null);

    try {
      const response = await fetch(`/api/merchant/leads/${leadId}/email`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as LeadEmailHistoryResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Historique indisponible");
      }

      setEmailHistory({
        delivery: payload.delivery,
        events: payload.events,
      });

      if (forceOpen) {
        setIsHistoryOpen(true);
      }
    } catch (historyError) {
      setError(historyError instanceof Error ? historyError.message : "Historique indisponible");
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
      await loadHistory(false);
      router.refresh();
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : "Renvoi impossible");
    } finally {
      setIsResending(false);
    }
  }

  const cooldownActive = resendLocked;
  const resendDisabled = isResending || emailDeliveryStatus === "queued" || cooldownActive;

  return (
    <div className={compact ? "space-y-2" : "min-w-[250px] space-y-2"}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => submit("redeem")}
          disabled={isPending || status === "redeemed"}
          className="rounded-[14px] bg-[#111827] px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          Marquer récupéré
        </button>
        <button
          type="button"
          onClick={() => submit("reset")}
          disabled={isPending || status === "claimed"}
          className="rounded-[14px] border border-[#d7e0ed] bg-white px-3 py-2 text-xs font-semibold text-[#182033] disabled:cursor-not-allowed disabled:opacity-45"
        >
          Réinitialiser
        </button>
        <button
          type="button"
          onClick={resendEmail}
          disabled={resendDisabled}
          className="rounded-[14px] bg-[#2f6df6] px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isResending ? "Renvoi..." : cooldownActive ? "Patientez 2 min" : "Renvoyer e-mail"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (!isHistoryOpen) {
              void loadHistory();
              return;
            }
            setIsHistoryOpen(false);
          }}
          className="rounded-[14px] border border-[#d7e0ed] bg-white px-3 py-2 text-xs font-semibold text-[#182033]"
        >
          {isHistoryOpen ? "Masquer" : "Historique e-mail"}
        </button>
      </div>

      {emailMessage ? <p className="text-xs font-semibold text-[#1f7d53]">{emailMessage}</p> : null}
      {!emailMessage && cooldownActive ? (
        <p className="text-xs text-[#7b8496]">Le dernier e-mail vient d’être envoyé.</p>
      ) : null}
      {error ? <p className="text-xs font-semibold text-[#c2410c]">{error}</p> : null}

      {isHistoryOpen ? (
        <div className="rounded-[18px] border border-[#e4eaf2] bg-[#f8fafc] p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#7b8496]">
                Suivi e-mail
              </p>
              <p className="mt-1 text-sm font-semibold text-[#111827]">
                {emailHistory?.delivery
                  ? rewardEmailStatusLabel(emailHistory.delivery.status)
                  : "Aucun e-mail enregistré"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadHistory(false)}
              className="rounded-[12px] border border-[#d7e0ed] bg-white px-3 py-2 text-[11px] font-semibold text-[#182033]"
            >
              Actualiser
            </button>
          </div>

          {emailHistory?.delivery ? (
            <div className="mt-3 space-y-2 text-xs text-[#556173]">
              <p>Objet : {emailHistory.delivery.subject}</p>
              <p>Destinataire : {emailHistory.delivery.recipientEmail}</p>
              {emailHistory.delivery.sentAt ? (
                <p>Envoyé : {formatDateTime(emailHistory.delivery.sentAt)}</p>
              ) : null}
              {emailHistory.delivery.deliveredAt ? (
                <p>Distribué : {formatDateTime(emailHistory.delivery.deliveredAt)}</p>
              ) : null}
              {emailHistory.delivery.errorMessage ? (
                <p className="font-semibold text-[#c2410c]">
                  Erreur : {emailHistory.delivery.errorMessage}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-xs text-[#7b8496]">
              Aucun envoi n&apos;a encore été enregistré pour ce gain.
            </p>
          )}

          {emailHistory?.events?.length ? (
            <div className="mt-3 space-y-2">
              {emailHistory.events.slice(0, 6).map((event) => (
                <div
                  key={event.id}
                  className="rounded-[14px] border border-[#e4eaf2] bg-white px-3 py-3 text-xs"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold capitalize text-[#111827]">
                      {event.eventType.replaceAll(".", " ")}
                    </span>
                    <span className="text-[#7b8496]">{formatDateTime(event.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-3 text-xs text-[#7b8496]">Statut du lot : {leadStatusLabel(status)}</div>
        </div>
      ) : null}
    </div>
  );
}

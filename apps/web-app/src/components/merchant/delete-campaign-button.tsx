"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type DeleteCampaignButtonProps = {
  campaignId: string;
  campaignTitle: string;
  className?: string;
  onDone?: () => void;
  variant?: "default" | "menu";
};

export function DeleteCampaignButton({
  campaignId,
  campaignTitle,
  className,
  onDone,
  variant = "default",
}: DeleteCampaignButtonProps) {
  const router = useRouter();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMenu = variant === "menu";

  useEffect(() => {
    if (!isConfirmOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isDeleting) setIsConfirmOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isConfirmOpen, isDeleting]);

  function openConfirmation() {
    setError(null);
    setIsConfirmOpen(true);
  }

  async function deleteCampaign() {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("La campagne n'a pas pu être supprimée.");
      }

      setIsConfirmOpen(false);
      window.dispatchEvent(new Event("campaigns-updated"));
      router.refresh();
      onDone?.();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "La campagne n'a pas pu être supprimée.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openConfirmation}
        disabled={isDeleting}
        className={cn(
          "inline-flex w-full cursor-pointer items-center text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
          isMenu
            ? "min-h-9 gap-2 rounded-[8px] border border-transparent bg-transparent px-2.5 py-2 text-[#b42318] hover:bg-[#fff7f7]"
            : "gap-3 rounded-[12px] border border-[#f0d8d8] bg-white px-4 py-3 text-[#b42318] hover:border-[#e7b4b4] hover:bg-[#fff7f7]",
          className,
        )}
      >
        <DeleteIcon compact={isMenu} />
        Supprimer
      </button>

      {isConfirmOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-[#0f1220]/52 px-4 pb-4 pt-10 backdrop-blur-[6px] sm:items-center sm:p-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isDeleting) {
              setIsConfirmOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-campaign-title"
            aria-describedby="delete-campaign-description"
            className="w-full max-w-[440px] rounded-[34px] bg-white p-6 text-[#111827] shadow-[0_34px_90px_rgba(18,24,39,0.24)]"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#fff1f1]">
              <DeleteIcon />
            </div>
            <h2 id="delete-campaign-title" className="mt-5 text-center text-2xl font-semibold text-[#0f1728]">
              Supprimer ce jeu ?
            </h2>
            <p id="delete-campaign-description" className="mt-3 text-center text-sm leading-7 text-[#5c6577]">
              <span className="font-semibold text-[#182033]">{campaignTitle}</span> et les lots, participations et contacts associés seront supprimés définitivement.
            </p>
            {error ? (
              <p role="alert" className="mt-4 rounded-[14px] border border-[#f2c8c8] bg-[#fff4f4] px-4 py-3 text-sm leading-6 text-[#a11a1a]">
                {error}
              </p>
            ) : null}
            <div className="mt-6">
              <button
                type="button"
                onClick={() => void deleteCampaign()}
                disabled={isDeleting}
                className="okado-filled-action w-full justify-center bg-[#b42318] px-4 text-white hover:bg-[#8f1b13] disabled:opacity-60"
              >
                {isDeleting ? "Suppression…" : "Supprimer définitivement"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function DeleteIcon({ compact = false }: { compact?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center text-[#b42318]",
        compact ? "h-4 w-4" : "h-8 w-8 rounded-full bg-[#fff1f1]",
      )}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
        <path d="M4 7h16" />
        <path d="M9 7V5h6v2" />
        <path d="M8 10v7" />
        <path d="M12 10v7" />
        <path d="M16 10v7" />
        <path d="M6 7l1 12h10l1-12" />
      </svg>
    </span>
  );
}

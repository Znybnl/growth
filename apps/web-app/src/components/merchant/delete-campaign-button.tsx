"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ValidationDialog } from "@/components/ui/validation-dialog";
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

      <ValidationDialog
        open={isConfirmOpen}
        title="Supprimer ce jeu ?"
        description={`${campaignTitle} et les lots, participations et contacts associés seront supprimés définitivement.`}
        ctaLabel={isDeleting ? "Suppression…" : "Supprimer définitivement"}
        tone="error"
        error={error}
        actionDisabled={isDeleting}
        onClose={() => {
          if (!isDeleting) setIsConfirmOpen(false);
        }}
        onAction={() => void deleteCampaign()}
      />
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

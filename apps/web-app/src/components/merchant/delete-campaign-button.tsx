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
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        throw new Error(
          payload?.error ?? "La campagne n'a pas pu être supprimée.",
        );
      }

      setIsConfirmOpen(false);
      window.dispatchEvent(new Event("campaigns-updated"));

      if (window.location.pathname === "/campaigns") {
        // Recreate the campaigns route so the server reads the list again
        // instead of reusing the prefetched RSC payload for the current URL.
        const url = new URL(window.location.href);
        url.searchParams.set("updated", Date.now().toString());
        router.replace(`${url.pathname}?${url.searchParams.toString()}`, {
          scroll: false,
        });
      } else {
        router.refresh();
      }

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
            ? "min-h-9 gap-2 rounded-[4px] border border-transparent bg-transparent px-2.5 py-2 text-[var(--okado-status-danger-text)] hover:bg-[var(--okado-status-danger-bg)]"
            : "gap-2 rounded-[4px] border border-transparent bg-transparent px-2.5 py-2 text-[var(--okado-status-danger-text)] hover:bg-[var(--okado-status-danger-bg)]",
          className,
        )}
      >
        <DeleteIcon />
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

function DeleteIcon() {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex h-4 w-4 shrink-0 items-center justify-center text-[var(--okado-status-danger-text)]",
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

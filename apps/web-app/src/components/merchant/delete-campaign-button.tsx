"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ValidationDialog } from "@/components/ui/validation-dialog";
import { cn } from "@/lib/utils";

type DeleteCampaignDialogProps = {
  campaignId: string;
  campaignTitle: string;
  open: boolean;
  onClose: () => void;
  onDeleted?: () => void;
};

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
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const isMenu = variant === "menu";

  function openConfirmation() {
    setIsConfirmOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={openConfirmation}
        className={cn(
          "inline-flex w-full cursor-pointer items-center text-left text-sm font-semibold transition",
          isMenu
            ? "min-h-9 gap-2 rounded-[4px] border border-transparent bg-transparent px-2.5 py-2 text-[var(--okado-status-danger-text)] hover:bg-[var(--okado-status-danger-bg)]"
            : "gap-2 rounded-[4px] border border-transparent bg-transparent px-2.5 py-2 text-[var(--okado-status-danger-text)] hover:bg-[var(--okado-status-danger-bg)]",
          className,
        )}
      >
        <DeleteIcon />
        Supprimer
      </button>

      <DeleteCampaignDialog
        campaignId={campaignId}
        campaignTitle={campaignTitle}
        open={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onDeleted={onDone}
      />
    </>
  );
}

export function DeleteCampaignDialog({
  campaignId,
  campaignTitle,
  open,
  onClose,
  onDeleted,
}: DeleteCampaignDialogProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      onClose();
      window.dispatchEvent(new Event("campaigns-updated"));
      onDeleted?.();

      if (window.location.pathname === "/campaigns") {
        const url = new URL(window.location.href);
        url.searchParams.set("updated", Date.now().toString());
        router.replace(`${url.pathname}?${url.searchParams.toString()}`, {
          scroll: false,
        });
      } else {
        router.refresh();
      }
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

  function closeDialog() {
    if (isDeleting) return;
    setError(null);
    onClose();
  }

  return (
    <ValidationDialog
      open={open}
      title="Supprimer ce jeu ?"
      description={`${campaignTitle} et les lots, participations et contacts associés seront supprimés définitivement.`}
      ctaLabel={isDeleting ? "Suppression…" : "Supprimer définitivement"}
      tone="error"
      error={error}
      actionDisabled={isDeleting}
      onClose={closeDialog}
      onAction={() => void deleteCampaign()}
    />
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
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4 fill-none stroke-current stroke-[1.8]"
      >
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

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type DeleteCampaignButtonProps = {
  campaignId: string;
  campaignTitle: string;
  className?: string;
  onDone?: () => void;
};

export function DeleteCampaignButton({
  campaignId,
  campaignTitle,
  className,
  onDone,
}: DeleteCampaignButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function deleteCampaign() {
    const confirmed = window.confirm(
      `Supprimer la campagne "${campaignTitle}" et ses données associées ?`,
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("La campagne n'a pas pu être supprimée.");
      }

      router.refresh();
      onDone?.();
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "La campagne n'a pas pu être supprimée.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={deleteCampaign}
      disabled={isDeleting}
      className={`inline-flex w-full cursor-pointer items-center gap-3 rounded-[16px] border border-[#f0d8d8] bg-white px-4 py-3 text-left text-sm font-semibold text-[#b42318] transition hover:border-[#e7b4b4] hover:bg-[#fff7f7] disabled:cursor-not-allowed disabled:opacity-60 ${className ?? ""}`}
    >
      <span
        aria-hidden="true"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fff1f1] text-[#b42318]"
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
      {isDeleting ? "Suppression..." : "Supprimer"}
    </button>
  );
}

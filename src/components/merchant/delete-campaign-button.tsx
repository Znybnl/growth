"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type DeleteCampaignButtonProps = {
  campaignId: string;
  campaignTitle: string;
};

export function DeleteCampaignButton({
  campaignId,
  campaignTitle,
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
      className="rounded-[18px] border border-[#ffd6d6] bg-[#fff5f5] px-4 py-3 text-sm font-semibold text-[#b42318] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isDeleting ? "Suppression..." : "Supprimer"}
    </button>
  );
}

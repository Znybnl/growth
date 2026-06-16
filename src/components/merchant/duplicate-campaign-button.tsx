"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type DuplicateCampaignButtonProps = {
  campaignId: string;
};

export function DuplicateCampaignButton({ campaignId }: DuplicateCampaignButtonProps) {
  const router = useRouter();
  const [isDuplicating, setIsDuplicating] = useState(false);

  async function duplicateCampaign() {
    setIsDuplicating(true);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/duplicate`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("La campagne n'a pas pu être dupliquée.");
      }

      router.refresh();
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "La campagne n'a pas pu être dupliquée.",
      );
    } finally {
      setIsDuplicating(false);
    }
  }

  return (
    <button
      type="button"
      onClick={duplicateCampaign}
      disabled={isDuplicating}
      className="rounded-[18px] border border-[#d7e0ed] bg-white px-4 py-3 text-sm font-semibold text-[#182033] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isDuplicating ? "Duplication..." : "Dupliquer"}
    </button>
  );
}

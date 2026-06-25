"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type DuplicateCampaignButtonProps = {
  campaignId: string;
  className?: string;
  onDone?: () => void;
};

export function DuplicateCampaignButton({
  campaignId,
  className,
  onDone,
}: DuplicateCampaignButtonProps) {
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
      onDone?.();
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
      className={`inline-flex w-full cursor-pointer items-center gap-3 rounded-[16px] border border-[#d7e0ed] bg-white px-4 py-3 text-left text-sm font-semibold text-[#182033] transition hover:border-[#c5d2e5] hover:bg-[#f8fbff] disabled:cursor-not-allowed disabled:opacity-60 ${className ?? ""}`}
    >
      <span
        aria-hidden="true"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f3f6fb] text-[#182033]"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
          <path d="M8 8h11v11H8z" />
          <path d="M5 5h11v11" />
        </svg>
      </span>
      {isDuplicating ? "Duplication..." : "Dupliquer"}
    </button>
  );
}

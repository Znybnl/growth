"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";

type DuplicateCampaignButtonProps = {
  campaignId: string;
  className?: string;
  onDone?: () => void;
  variant?: "default" | "menu";
};

export function DuplicateCampaignButton({
  campaignId,
  className,
  onDone,
  variant = "default",
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

  const isMenu = variant === "menu";

  return (
    <button
      type="button"
      onClick={duplicateCampaign}
      disabled={isDuplicating}
      className={cn(
        "inline-flex w-full cursor-pointer items-center text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        isMenu
          ? "min-h-9 gap-2 rounded-[8px] border border-transparent bg-transparent px-2.5 py-2 text-[#182033] hover:bg-linen-canvas"
          : "gap-3 rounded-[16px] border border-[#d7e0ed] bg-white px-4 py-3 text-[#182033] hover:border-[#c5d2e5] hover:bg-[#f8fbff]",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex shrink-0 items-center justify-center text-[#182033]",
          isMenu ? "h-4 w-4" : "h-8 w-8 rounded-full bg-[#f3f6fb]",
        )}
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

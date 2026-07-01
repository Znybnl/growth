"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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

  const isMenu = variant === "menu";

  return (
    <button
      type="button"
      onClick={deleteCampaign}
      disabled={isDeleting}
      className={cn(
        "inline-flex w-full cursor-pointer items-center text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        isMenu
          ? "min-h-9 gap-2 rounded-[8px] border border-transparent bg-transparent px-2.5 py-2 text-[#b42318] hover:bg-[#fff7f7]"
          : "gap-3 rounded-[16px] border border-[#f0d8d8] bg-white px-4 py-3 text-[#b42318] hover:border-[#e7b4b4] hover:bg-[#fff7f7]",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex shrink-0 items-center justify-center text-[#b42318]",
          isMenu ? "h-4 w-4" : "h-8 w-8 rounded-full bg-[#fff1f1]",
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
      {isDeleting ? "Suppression..." : "Supprimer"}
    </button>
  );
}

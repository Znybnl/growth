"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AffiliateCommissionStatus } from "@/lib/types";

type AffiliateCommissionActionsProps = {
  commissionId: string;
  currentStatus: AffiliateCommissionStatus;
};

const actions: Array<{ status: AffiliateCommissionStatus; label: string }> = [
  { status: "payable", label: "À payer" },
  { status: "paid", label: "Payée" },
  { status: "void", label: "Annuler" },
];

export function AffiliateCommissionActions({
  commissionId,
  currentStatus,
}: AffiliateCommissionActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  async function updateStatus(status: AffiliateCommissionStatus) {
    setIsLoading(status);

    try {
      const response = await fetch(`/api/affiliates/commissions/${commissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error("Mise à jour impossible.");
      }

      router.refresh();
    } finally {
      setIsLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          key={action.status}
          type="button"
          disabled={isLoading !== null || currentStatus === action.status}
          onClick={() => void updateStatus(action.status)}
          className="okado-secondary-action okado-compact-action px-3 text-xs disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isLoading === action.status ? "..." : action.label}
        </button>
      ))}
    </div>
  );
}

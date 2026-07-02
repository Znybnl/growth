"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PrizeStockActionsProps = {
  prizeId: string;
  remainingQuantity: number | null;
  totalQuantity: number | null;
};

export function PrizeStockActions({
  prizeId,
  remainingQuantity,
  totalQuantity,
}: PrizeStockActionsProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(
    remainingQuantity === null ? "" : String(remainingQuantity),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/merchant/prizes/${prizeId}/stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remainingQuantity: value.trim() === "" ? null : Number(value),
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Mise à jour impossible");
      }

      setEditing(false);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Mise à jour impossible");
    } finally {
      setPending(false);
    }
  }

  async function reset() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/merchant/prizes/${prizeId}/reset`, {
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Réinitialisation impossible");
      }

      setValue(totalQuantity === null ? "" : String(totalQuantity));
      setEditing(false);
      router.refresh();
    } catch (resetError) {
      setError(
        resetError instanceof Error ? resetError.message : "Réinitialisation impossible",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-3 space-y-2">
      {editing ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <input
            type="number"
            min="0"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Illimité"
            className="w-28 rounded-[14px] border border-[#d7e0ed] bg-white px-3 py-2 text-right text-sm text-[#111827] outline-none"
          />
          <button
            type="button"
            onClick={() => void save()}
            disabled={pending}
            className="cursor-pointer rounded-[14px] bg-[#111827] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            Enregistrer
          </button>
          <button
            type="button"
            onClick={() => {
              setValue(remainingQuantity === null ? "" : String(remainingQuantity));
              setEditing(false);
              setError(null);
            }}
            disabled={pending}
            className="cursor-pointer rounded-[14px] border border-[#d7e0ed] bg-white px-3 py-2 text-xs font-semibold text-[#182033] disabled:opacity-50"
          >
            Annuler
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={pending}
            className="cursor-pointer rounded-[14px] border border-[#d7e0ed] bg-white px-3 py-2 text-xs font-semibold text-[#182033] disabled:opacity-50"
          >
            Modifier le stock
          </button>
          <button
            type="button"
            onClick={() => void reset()}
            disabled={pending}
            className="cursor-pointer rounded-[14px] bg-[#111827] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            Réinitialiser
          </button>
        </div>
      )}
      {error ? <p className="text-right text-xs font-semibold text-[#c2410c]">{error}</p> : null}
    </div>
  );
}

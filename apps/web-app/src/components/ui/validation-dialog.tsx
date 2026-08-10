"use client";

import { useEffect } from "react";

type ValidationDialogProps = {
  open: boolean;
  title: string;
  description: string;
  ctaLabel: string;
  onClose: () => void;
  onAction?: () => void;
  tone?: "info" | "error";
};

/**
 * Shared confirmation surface for completed merchant actions.
 * It intentionally exposes one action only; clicking the backdrop also closes it.
 */
export function ValidationDialog({
  open,
  title,
  description,
  ctaLabel,
  onClose,
  onAction,
  tone = "info",
}: ValidationDialogProps) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-[#0f1220]/52 px-4 pb-4 pt-10 backdrop-blur-[6px] sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="validation-dialog-title"
        aria-describedby="validation-dialog-description"
        className="w-full max-w-[420px] rounded-[34px] bg-white p-6 text-[#111827] shadow-[0_34px_90px_rgba(18,24,39,0.24)]"
      >
        <div
          aria-hidden="true"
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl ${
            tone === "error" ? "bg-[#fff1f2] text-[#be123c]" : "bg-[#eef4ff] text-[#2f6df6]"
          }`}
        >
          {tone === "error" ? "!" : "✓"}
        </div>
        <h2 id="validation-dialog-title" className="mt-5 text-center text-2xl font-semibold text-[#0f1728]">
          {title}
        </h2>
        <p id="validation-dialog-description" className="mt-3 text-center text-sm leading-7 text-[#5c6577]">
          {description}
        </p>
        <div className="mt-6">
          <button
            type="button"
            onClick={onAction ?? onClose}
            className="w-full rounded-[20px] border border-[#111827] bg-[#111827] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#263247]"
          >
            {ctaLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
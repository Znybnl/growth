"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

type ValidationDialogProps = {
  open: boolean;
  title: string;
  description: string;
  ctaLabel: string;
  onClose: () => void;
  onAction?: () => void;
  tone?: "info" | "error";
  error?: string | null;
  actionDisabled?: boolean;
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
  error = null,
  actionDisabled = false,
}: ValidationDialogProps) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-deep-plum/55 px-4 pb-4 pt-10 backdrop-blur-[6px] sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="validation-dialog-title"
        aria-describedby={error ? "validation-dialog-description validation-dialog-error" : "validation-dialog-description"}
        className="w-full max-w-[420px] rounded-[32px] border border-lavender-mist bg-white p-6 text-carbon shadow-[0_0_32px_rgba(0,0,0,0.1)]"
      >
        <div
          aria-hidden="true"
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl ${
            tone === "error" ? "bg-[#fff1f2] text-[#be123c]" : "bg-purple-haze text-aubergine"
          }`}
        >
          {tone === "error" ? "!" : "✓"}
        </div>
        <h2 id="validation-dialog-title" className="mt-5 text-center text-2xl font-semibold text-carbon">
          {title}
        </h2>
        <p id="validation-dialog-description" className="mt-3 text-center text-sm leading-7 text-ash">
          {description}
        </p>
        {error ? (
          <p
            id="validation-dialog-error"
            role="alert"
            className="mt-4 rounded-[8px] border border-coral-alert/30 bg-coral-alert/10 px-4 py-3 text-left text-sm leading-6 text-coral-alert"
          >
            {error}
          </p>
        ) : null}
        <div className="mt-6">
          <button
            type="button"
            onClick={onAction ?? onClose}
            disabled={actionDisabled}
            className="okado-filled-action w-full px-4 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {ctaLabel}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

export { ValidationDialog as ConfirmDialog };

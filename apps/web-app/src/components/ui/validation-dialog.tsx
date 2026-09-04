"use client";

import { useId } from "react";

import { DialogShell } from "@/components/ui/dialog";
type ValidationDialogProps = {
  open: boolean;
  title: string;
  description: string;
  ctaLabel: string;
  onClose: () => void;
  onAction?: () => void;
  secondaryCtaLabel?: string;
  onSecondaryAction?: () => void;
  secondaryActionDisabled?: boolean;
  cancelLabel?: string;
  onCancel?: () => void;
  tone?: "info" | "error";
  error?: string | null;
  actionDisabled?: boolean;
};

/**
 * Shared confirmation surface for completed merchant actions and decisions.
 * The optional secondary and cancel actions keep multi-step confirmations consistent.
 */
export function ValidationDialog({
  open,
  title,
  description,
  ctaLabel,
  onClose,
  onAction,
  secondaryCtaLabel,
  onSecondaryAction,
  secondaryActionDisabled = false,
  cancelLabel,
  onCancel,
  tone = "info",
  error = null,
  actionDisabled = false,
}: ValidationDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const errorId = useId();

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      describedBy={error ? `${descriptionId} ${errorId}` : descriptionId}
    >
        <div
          aria-hidden="true"
          className={`okado-dialog-icon mx-auto text-2xl ${
            tone === "error" ? "bg-[#fff1f2] text-[#be123c]" : "bg-purple-haze text-aubergine"
          }`}
        >
          {tone === "error" ? "!" : "✓"}
        </div>
        <h2 id={titleId} className="okado-dialog-title text-center">
          {title}
        </h2>
        <p id={descriptionId} className="okado-dialog-description text-center">
          {description}
        </p>
        {error ? (
          <p
            id={errorId}
            role="alert"
            className="mt-4 rounded-[8px] border border-coral-alert/30 bg-coral-alert/10 px-4 py-3 text-left text-sm leading-6 text-coral-alert"
          >
            {error}
          </p>
        ) : null}
        <div className="mt-6 space-y-2">
          <button
            type="button"
            onClick={onAction ?? onClose}
            disabled={actionDisabled}
            className="okado-filled-action w-full px-4 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {ctaLabel}
          </button>
          {secondaryCtaLabel ? (
            <button
              type="button"
              onClick={onSecondaryAction}
              disabled={secondaryActionDisabled}
              className="okado-secondary-action w-full px-4 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {secondaryCtaLabel}
            </button>
          ) : null}
          {cancelLabel ? (
            <button
              type="button"
              onClick={onCancel ?? onClose}
              disabled={secondaryActionDisabled}
              className="w-full rounded-[4px] border border-transparent px-4 py-2.5 text-sm font-semibold text-charcoal transition hover:bg-soft-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelLabel}
            </button>
          ) : null}
        </div>
    </DialogShell>
  );
}

export { ValidationDialog as ConfirmDialog };

"use client";

import Link from "next/link";
import { ChevronDown, Mail } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  createCampaignEmailDefaults,
  normalizeCampaignEmailSettings,
  renderRewardEmailHtml,
} from "@/lib/email-settings";
import { RewardEmailPreviewFrame } from "@/components/merchant/reward-email-preview-frame";
import { CampaignSetupInput, Merchant } from "@/lib/types";

type CampaignEmailPreviewProps = {
  merchant: Merchant;
  form: Pick<CampaignSetupInput, "id" | "title" | "prizes" | "presentation" | "logoUrl">;
};

const sampleData = {
  firstName: "Léa",
  redemptionCode: "OK-TEST-1234",
  rewardAvailability: "Disponible dès maintenant au comptoir.",
  rewardExpiry: "Valable pendant 30 jours.",
};

function replaceVariables(template: string, variables: Record<string, string>) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => variables[key] ?? "");
}

export function CampaignEmailPreview({ merchant, form }: CampaignEmailPreviewProps) {
  const email = normalizeCampaignEmailSettings(
    form.presentation.email,
    createCampaignEmailDefaults(merchant),
  );
  const prize = form.prizes[0];
  const variables = {
    firstName: sampleData.firstName,
    merchantName: merchant.companyName,
    campaignTitle: form.title || "Votre campagne",
    prizeLabel: prize?.label || "Cadeau surprise",
    redemptionCode: sampleData.redemptionCode,
    redeemUrl: "https://app.okado.app/redeem/OK-TEST-1234",
    qrUrl: "/email-demo-qr.png",
    rewardAvailability: sampleData.rewardAvailability,
    rewardExpiry: sampleData.rewardExpiry,
    rewardDate: "24 juillet 2026",
    purchaseCondition: prize?.purchaseRequired
      ? "Achat requis pour retirer ce lot."
      : "",
    usageConditions: prize?.usageConditions || "",
  };
  const subject = replaceVariables(email.subject, variables);
  const preheader = replaceVariables(email.preheader, variables);
  const html = renderRewardEmailHtml(email, variables, {
    // A non-redeemable demo QR, never a real player's code.
    logoSrc: form.logoUrl,
    appointmentUrl: merchant.appointmentUrl,
  });

  return (
    <Collapsible className="okado-card overflow-hidden" defaultOpen={false}>
      <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-sky-wash text-primary-action-accent">
            <Mail className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="okado-label">Confirmation de gain</p>
            <h2 className="mt-1 truncate text-base font-semibold text-graphite">Aperçu de l&apos;e-mail client</h2>
          </div>
        </div>
        <CollapsibleTrigger className="group inline-flex shrink-0 items-center gap-2 rounded-[10px] border border-border bg-white px-3 py-2 text-xs font-semibold text-graphite transition hover:bg-linen-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-action-accent/30">
          Afficher l&apos;aperçu
          <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="border-t border-border bg-linen-canvas/55 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.18em] text-ash">Objet généré</p>
            <p className="mt-1 truncate text-sm font-semibold text-graphite">{subject}</p>
            <p className="mt-1 text-xs text-ash">{preheader}</p>
          </div>
          {form.id ? (
            <Link href={`/campaigns/${form.id}/email`} prefetch={false} className="okado-secondary-action shrink-0 px-3 text-xs">
              Personnaliser l&apos;e-mail
            </Link>
          ) : null}
        </div>

        <div className="mx-auto mt-5 w-full max-w-[620px] overflow-hidden rounded-[20px] border border-[#dbe4f0] bg-white shadow-[0_16px_38px_rgba(17,24,39,0.1)]">
          <RewardEmailPreviewFrame html={html} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

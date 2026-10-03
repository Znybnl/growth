"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  CAMPAIGN_EMAIL_VARIABLES,
  createCampaignEmailDefaults,
  normalizeCampaignEmailSettings,
  validateCampaignEmailSettings,
  renderEmailTemplate,
  renderRewardEmailHtml,
} from "@/lib/email-settings";
import { RewardEmailPreviewFrame } from "@/components/merchant/reward-email-preview-frame";
import { Campaign, CampaignEmailSettings, Merchant, Prize } from "@/lib/types";
import { PageHeader } from "@/components/ui/workspace";

type EmailEditorProps = {
  campaign: Campaign;
  merchant: Merchant;
  prizes: Prize[];
};

const sampleData = {
  firstName: "Léa",
  prizeLabel: "Boisson offerte",
  redemptionCode: "OK-AB12CD34",
  rewardAvailability: "Disponible dès maintenant au comptoir.",
  rewardExpiry: "Valable jusqu'au 22 juin 2026 à 18:00.",
  purchaseCondition: "",
};

export function EmailEditor({ campaign, merchant, prizes }: EmailEditorProps) {
  const router = useRouter();
  const [email, setEmail] = useState<CampaignEmailSettings>(() =>
    normalizeCampaignEmailSettings(
      campaign.presentation.email,
      createCampaignEmailDefaults(merchant),
    ),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const validationErrors = useMemo(() => validateCampaignEmailSettings(email), [email]);

  const preview = useMemo(() => {
    const prize = prizes[0];
    const variables = {
      ...sampleData,
      merchantName: merchant.companyName,
      campaignTitle: campaign.title,
      prizeLabel: prize?.label || sampleData.prizeLabel,
      redeemUrl: "https://app.okado.app/redeem/OK-AB12CD34",
      qrUrl: "/email-demo-qr.png",
      rewardDate: "3 octobre 2026",
      usageConditions: prize?.usageConditions || "",
      purchaseCondition: prize?.purchaseRequired ? "Retrait du lot soumis à une condition d’achat." : "",
    };
    return {
      subject: renderEmailTemplate(email.subject, variables),
      preheader: renderEmailTemplate(email.preheader, variables),
      senderName: renderEmailTemplate(email.senderName, variables),
      html: renderRewardEmailHtml(email, variables, {
        logoSrc: campaign.logoUrl,
        appointmentUrl: merchant.appointmentUrl,
      }),
    };
  }, [campaign, email, merchant, prizes]);

  function updateField<Key extends keyof CampaignEmailSettings>(
    key: Key,
    value: CampaignEmailSettings[Key],
  ) {
    setEmail((current) => ({ ...current, [key]: value }));
  }

  async function saveEmailSettings() {
    if (validationErrors.length) {
      setMessage("Corrigez les informations obligatoires avant d’enregistrer.");
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/email-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(email),
      });
      const payload = (await response.json()) as { error?: string; details?: string[] };

      if (!response.ok) {
        throw new Error(payload.details?.join(" ") || payload.error || "Enregistrement impossible.");
      }

      setMessage("Email enregistré.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally {
      setIsSaving(false);
    }
  }

  function restoreRecommendedEmail() {
    setEmail(normalizeCampaignEmailSettings(createCampaignEmailDefaults(merchant), createCampaignEmailDefaults(merchant)));
    setMessage("Modèle recommandé restauré. Enregistrez pour l’appliquer.");
  }

  return (
    <div className="okado-editor-page min-h-[calc(100vh-120px)] space-y-6">
      <section className="px-1">
          <PageHeader
            eyebrow="Atelier email"
            title="Personnaliser l&apos;email de gain"
            description="Cet écran pilote le message envoyé automatiquement au gagnant avec son QR code, son code de retrait et le lien de validation."
            actions={<>
              <Link
                href={`/campaigns/${campaign.id}/edit/guided`}
                prefetch={false}
                className="okado-primary-action px-4"
              >
                Revenir à la campagne
              </Link>
              <button
                type="button"
                onClick={restoreRecommendedEmail}
                className="okado-primary-action px-4"
              >
                Restaurer le modèle
              </button>
              <button
                type="button"
                onClick={saveEmailSettings}
                disabled={isSaving || validationErrors.length > 0}
                className="okado-filled-action px-5 disabled:opacity-60"
              >
                {isSaving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </>}
          />
          {message ? (
            <div className="mt-5 rounded-[8px] border border-border bg-linen-canvas px-4 py-3 text-sm font-semibold text-graphite">
              {message}
            </div>
          ) : null}
          {validationErrors.length ? (
            <div role="alert" className="mt-5 rounded-[8px] border border-[#f2c8c8] bg-[#fff4f4] px-4 py-4 text-sm text-[#a11a1a]">
              <p className="font-semibold">Informations obligatoires manquantes</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 leading-6">
                {validationErrors.map((validationError) => <li key={validationError}>{validationError}</li>)}
              </ul>
            </div>
          ) : null}
      </section>

      <section className="okado-card okado-preview-surface p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="okado-label">Prévisualisation</p>
            <h2 className="okado-section-title mt-2">E-mail client</h2>
            <p className="mt-2 text-sm leading-6 text-ash">
              Les données ci-dessous sont des exemples : elles permettent de vérifier le rendu avant envoi.
            </p>
          </div>
          <span className="rounded-full bg-linen-canvas px-3 py-1.5 text-xs font-semibold text-graphite">
            Aperçu en direct
          </span>
        </div>

        <div className="mt-6 flex justify-center rounded-[12px] border border-border bg-linen-canvas p-4 sm:p-6">
          <div className="w-full max-w-[680px] overflow-hidden rounded-[20px] bg-white shadow-[0_20px_50px_rgba(15,23,42,0.12)]">
            <div className="border-b border-[#edf2f7] px-6 py-4">
              <div className="text-xs uppercase tracking-[0.22em] text-[#94a3b8]">Objet</div>
              <div className="mt-2 text-base font-semibold text-[#111827]">{preview.subject}</div>
              <div className="mt-2 text-sm text-[#64748b]">{preview.preheader}</div>
              <div className="mt-2 text-xs text-[#64748b]">
                Expéditeur : {preview.senderName}
                {email.replyTo ? ` · Reply-to : ${email.replyTo}` : ""}
              </div>
            </div>

            <RewardEmailPreviewFrame html={preview.html} />
          </div>
        </div>
      </section>

      <section className="okado-card p-6">
          <p className="okado-label">Expédition</p>
          <h2 className="okado-section-title mt-2">Objet, expéditeur et reply-to</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              <span className="mb-2 block text-charcoal">Nom expéditeur visible</span>
              <input
                value={email.senderName}
                onChange={(event) => updateField("senderName", event.target.value)}
                className="w-full rounded-[12px] border border-fog bg-white px-4 py-3 text-carbon outline-none focus:border-aubergine focus:ring-4 focus:ring-aubergine/15"
              />
            </label>

            <label className="text-sm">
              <span className="mb-2 block text-charcoal">Reply-to</span>
              <input
                type="email"
                value={email.replyTo}
                onChange={(event) => updateField("replyTo", event.target.value)}
                placeholder="service@maison-sora.fr"
                className="w-full rounded-[12px] border border-fog bg-white px-4 py-3 text-carbon outline-none focus:border-aubergine focus:ring-4 focus:ring-aubergine/15"
              />
            </label>

            <label className="text-sm md:col-span-2">
              <span className="mb-2 block text-charcoal">Objet</span>
              <input
                value={email.subject}
                onChange={(event) => updateField("subject", event.target.value)}
                className="w-full rounded-[12px] border border-fog bg-white px-4 py-3 text-carbon outline-none focus:border-aubergine focus:ring-4 focus:ring-aubergine/15"
              />
            </label>

            <label className="text-sm md:col-span-2">
              <span className="mb-2 block text-charcoal">Pré-header</span>
              <input
                value={email.preheader}
                onChange={(event) => updateField("preheader", event.target.value)}
                className="w-full rounded-[12px] border border-fog bg-white px-4 py-3 text-carbon outline-none focus:border-aubergine focus:ring-4 focus:ring-aubergine/15"
              />
            </label>
          </div>
      </section>

      <section className="okado-card p-6">
          <p className="okado-label">Contenu</p>
          <h2 className="okado-section-title mt-2">Message envoyé au client</h2>

          <div className="mt-4 rounded-[8px] bg-purple-haze px-4 py-4 text-sm leading-7 text-charcoal">
            Les blocs de retrait (code, QR code et lien) sont ajoutés automatiquement et ne peuvent pas être supprimés. Variables disponibles :
            <span className="ml-2 font-mono text-[13px]">
              {CAMPAIGN_EMAIL_VARIABLES.map((variable) => `{{${variable}}}`).join(", ")}
            </span>
          </div>

          <div className="mt-6 grid gap-4">
            <label className="text-sm">
              <span className="mb-2 block text-charcoal">Titre principal</span>
              <input
                value={email.headline}
                onChange={(event) => updateField("headline", event.target.value)}
                className="w-full rounded-[12px] border border-fog bg-white px-4 py-3 text-carbon outline-none focus:border-aubergine focus:ring-4 focus:ring-aubergine/15"
              />
            </label>

            <label className="text-sm">
              <span className="mb-2 block text-charcoal">Corps du message</span>
              <textarea
                rows={10}
                value={email.body}
                onChange={(event) => updateField("body", event.target.value)}
                className="w-full rounded-[12px] border border-fog bg-white px-4 py-3 text-carbon outline-none focus:border-aubergine focus:ring-4 focus:ring-aubergine/15"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-2 block text-charcoal">Libellé du bouton</span>
                <input
                  value={email.buttonLabel}
                  onChange={(event) => updateField("buttonLabel", event.target.value)}
                  className="w-full rounded-[12px] border border-fog bg-white px-4 py-3 text-carbon outline-none focus:border-aubergine focus:ring-4 focus:ring-aubergine/15"
                />
              </label>

              <label className="text-sm">
                <span className="mb-2 block text-charcoal">Couleur d’accent</span>
                <input
                  type="color"
                  value={email.accentColor}
                  onChange={(event) => updateField("accentColor", event.target.value)}
                  className="h-14 w-full rounded-[12px] border border-fog bg-white px-2 py-2 outline-none focus:border-aubergine focus:ring-4 focus:ring-aubergine/15"
                />
              </label>
            </div>

            <label className="text-sm">
              <span className="mb-2 block text-charcoal">Note de bas d’email</span>
              <textarea
                rows={4}
                value={email.footerNote}
                onChange={(event) => updateField("footerNote", event.target.value)}
                className="w-full rounded-[12px] border border-fog bg-white px-4 py-3 text-carbon outline-none focus:border-aubergine focus:ring-4 focus:ring-aubergine/15"
              />
            </label>
          </div>
      </section>
    </div>
  );
}

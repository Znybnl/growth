"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  createCampaignEmailDefaults,
  normalizeCampaignEmailSettings,
} from "@/lib/email-settings";
import { Campaign, CampaignEmailSettings, Merchant } from "@/lib/types";

type EmailEditorProps = {
  campaign: Campaign;
  merchant: Merchant;
};

const sampleData = {
  firstName: "Léa",
  prizeLabel: "Boisson offerte",
  redemptionCode: "OK-AB12CD34",
  rewardAvailability: "Disponible dès maintenant au comptoir.",
  rewardExpiry: "Valable jusqu'au 22 juin 2026 à 18:00.",
  purchaseCondition: "",
};

function replaceVariables(template: string, campaign: Campaign, merchant: Merchant) {
  return template
    .replaceAll("{{firstName}}", sampleData.firstName)
    .replaceAll("{{merchantName}}", merchant.companyName)
    .replaceAll("{{campaignTitle}}", campaign.title)
    .replaceAll("{{prizeLabel}}", sampleData.prizeLabel)
    .replaceAll("{{redemptionCode}}", sampleData.redemptionCode)
    .replaceAll("{{rewardAvailability}}", sampleData.rewardAvailability)
    .replaceAll("{{rewardExpiry}}", sampleData.rewardExpiry)
    .replaceAll("{{purchaseCondition}}", sampleData.purchaseCondition);
}

function splitBlocks(text: string) {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

export function EmailEditor({ campaign, merchant }: EmailEditorProps) {
  const router = useRouter();
  const [email, setEmail] = useState<CampaignEmailSettings>(() =>
    normalizeCampaignEmailSettings(
      campaign.presentation.email,
      createCampaignEmailDefaults(merchant),
    ),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const preview = useMemo(
    () => ({
      subject: replaceVariables(email.subject, campaign, merchant),
      preheader: replaceVariables(email.preheader, campaign, merchant),
      headline: replaceVariables(email.headline, campaign, merchant),
      body: splitBlocks(replaceVariables(email.body, campaign, merchant)),
      footer: splitBlocks(replaceVariables(email.footerNote, campaign, merchant)),
    }),
    [campaign, email, merchant],
  );

  function updateField<Key extends keyof CampaignEmailSettings>(
    key: Key,
    value: CampaignEmailSettings[Key],
  ) {
    setEmail((current) => ({ ...current, [key]: value }));
  }

  async function saveEmailSettings() {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/email-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(email),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Enregistrement impossible.");
      }

      setMessage("Email enregistré.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-120px)] gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.78fr)]">
      <div className="space-y-6">
        <section className="okado-card p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="okado-label">Atelier email</p>
              <h1 className="okado-page-title mt-3">
                Personnaliser l&apos;email de gain
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-ash">
                Cet écran pilote le message envoyé automatiquement au gagnant avec son QR code,
                son code de retrait et le lien de validation.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/campaigns/${campaign.id}/edit`}
                prefetch={false}
                className="okado-primary-action px-4 py-3"
              >
                Revenir à la campagne
              </Link>
              <button
                type="button"
                onClick={saveEmailSettings}
                disabled={isSaving}
                className="okado-filled-action px-5 py-3 disabled:opacity-60"
              >
                {isSaving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
          {message ? (
            <div className="mt-5 rounded-[8px] border border-border bg-linen-canvas px-4 py-3 text-sm font-semibold text-graphite">
              {message}
            </div>
          ) : null}
        </section>

        <section className="okado-card p-6">
          <p className="okado-label">Expédition</p>
          <h2 className="okado-section-title mt-2">Objet, expéditeur et reply-to</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              <span className="mb-2 block text-[#616b7c]">Nom expéditeur visible</span>
              <input
                value={email.senderName}
                onChange={(event) => updateField("senderName", event.target.value)}
                className="w-full rounded-[8px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
              />
            </label>

            <label className="text-sm">
              <span className="mb-2 block text-[#616b7c]">Reply-to</span>
              <input
                type="email"
                value={email.replyTo}
                onChange={(event) => updateField("replyTo", event.target.value)}
                placeholder="service@maison-sora.fr"
                className="w-full rounded-[8px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
              />
            </label>

            <label className="text-sm md:col-span-2">
              <span className="mb-2 block text-[#616b7c]">Objet</span>
              <input
                value={email.subject}
                onChange={(event) => updateField("subject", event.target.value)}
                className="w-full rounded-[8px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
              />
            </label>

            <label className="text-sm md:col-span-2">
              <span className="mb-2 block text-[#616b7c]">Pré-header</span>
              <input
                value={email.preheader}
                onChange={(event) => updateField("preheader", event.target.value)}
                className="w-full rounded-[8px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
              />
            </label>
          </div>
        </section>

        <section className="okado-card p-6">
          <p className="okado-label">Contenu</p>
          <h2 className="okado-section-title mt-2">Message envoyé au client</h2>

          <div className="mt-4 rounded-[8px] border border-[#e1e8f1] bg-[#f7f9fc] px-4 py-4 text-sm leading-7 text-[#516073]">
            Variables disponibles :
            <span className="ml-2 font-mono text-[13px]">
              {"{{firstName}}, {{merchantName}}, {{campaignTitle}}, {{prizeLabel}}, {{redemptionCode}}, {{rewardAvailability}}, {{rewardExpiry}}, {{purchaseCondition}}"}
            </span>
          </div>

          <div className="mt-6 grid gap-4">
            <label className="text-sm">
              <span className="mb-2 block text-[#616b7c]">Titre principal</span>
              <input
                value={email.headline}
                onChange={(event) => updateField("headline", event.target.value)}
                className="w-full rounded-[8px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
              />
            </label>

            <label className="text-sm">
              <span className="mb-2 block text-[#616b7c]">Corps du message</span>
              <textarea
                rows={10}
                value={email.body}
                onChange={(event) => updateField("body", event.target.value)}
                className="w-full rounded-[8px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-2 block text-[#616b7c]">Libellé du bouton</span>
                <input
                  value={email.buttonLabel}
                  onChange={(event) => updateField("buttonLabel", event.target.value)}
                  className="w-full rounded-[8px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
                />
              </label>

              <label className="text-sm">
                <span className="mb-2 block text-[#616b7c]">Couleur d’accent</span>
                <input
                  type="color"
                  value={email.accentColor}
                  onChange={(event) => updateField("accentColor", event.target.value)}
                  className="h-14 w-full rounded-[8px] border border-[#d7e0ed] bg-[#f7f9fc] px-2 py-2 outline-none"
                />
              </label>
            </div>

            <label className="text-sm">
              <span className="mb-2 block text-[#616b7c]">Note de bas d’email</span>
              <textarea
                rows={4}
                value={email.footerNote}
                onChange={(event) => updateField("footerNote", event.target.value)}
                className="w-full rounded-[8px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
              />
            </label>
          </div>
        </section>
      </div>

      <aside className="xl:sticky xl:top-6 xl:h-[calc(100vh-48px)]">
        <div className="flex h-full flex-col rounded-[8px] border border-[#dbe4f0] bg-[#111827] p-5 shadow-[0_24px_70px_rgba(17,24,39,0.24)]">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/48">Prévisualisation</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Email client</h2>
          </div>

          <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto rounded-[8px] bg-[#0b1020] p-4">
            <div className="w-full max-w-[430px] overflow-hidden rounded-[20px] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.28)]">
              <div className="border-b border-[#edf2f7] px-6 py-4">
                <div className="text-xs uppercase tracking-[0.22em] text-[#94a3b8]">Objet</div>
                <div className="mt-2 text-base font-semibold text-[#111827]">{preview.subject}</div>
                <div className="mt-2 text-sm text-[#64748b]">{preview.preheader}</div>
              </div>

              <div className="bg-[#f8fafc] px-6 py-8">
                <div className="rounded-[20px] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
                  <div className="text-center">
                    {campaign.logoUrl ? (
                      <Image
                        src={campaign.logoUrl}
                        alt="Logo"
                        width={180}
                        height={70}
                        unoptimized
                        className="mx-auto max-h-[56px] w-auto object-contain"
                      />
                    ) : (
                      <div className="text-2xl font-semibold text-[#111827]">
                        {campaign.logoText ?? merchant.companyName}
                      </div>
                    )}
                  </div>

                  <h3 className="mt-6 text-3xl font-semibold leading-tight text-[#111827]">
                    {preview.headline}
                  </h3>

                  <div className="mt-5 space-y-4 text-sm leading-7 text-[#475569]">
                    {preview.body.map((block) => (
                      <p key={block}>{block}</p>
                    ))}
                  </div>

                  <div className="mt-6 rounded-[18px] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-[#94a3b8]">
                      Code de retrait
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-[#0f172a]">
                      {sampleData.redemptionCode}
                    </div>
                  </div>

                  <div className="mt-6 flex items-center gap-4">
                    <div className="h-[128px] w-[128px] rounded-[18px] border border-[#dbe4f0] bg-[radial-gradient(#111827_1.5px,transparent_1.5px)] [background-size:8px_8px]" />
                    <button
                      type="button"
                      className="rounded-[14px] px-5 py-3 text-sm font-semibold text-white"
                      style={{ backgroundColor: email.accentColor }}
                    >
                      {email.buttonLabel}
                    </button>
                  </div>

                  <div className="mt-6 space-y-3 text-xs leading-6 text-[#64748b]">
                    {preview.footer.map((block) => (
                      <p key={block}>{block}</p>
                    ))}
                    {email.replyTo ? <p>Reply-to : {email.replyTo}</p> : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

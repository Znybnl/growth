import { NextResponse } from "next/server";

import { requireAuthenticatedSession } from "@/lib/auth";
import { validateCampaignEmailSettings } from "@/lib/email-settings";
import { parseCampaignSetupInput } from "@/lib/merchant-input";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";
import { getCampaignPerformance, updateCampaignSetup } from "@/lib/store";
import { CampaignEmailSettings } from "@/lib/types";

type EmailSettingsRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: EmailSettingsRouteProps) {
  try {
    assertTrustedMutationRequest(request);
    const session = await requireAuthenticatedSession();
    const { id } = await params;
    const email = (await request.json()) as CampaignEmailSettings;
    const emailErrors = validateCampaignEmailSettings(email);
    if (emailErrors.length) {
      return NextResponse.json(
        { error: "L’e-mail contient des informations obligatoires manquantes.", details: emailErrors },
        { status: 422 },
      );
    }
    const performance = await getCampaignPerformance(id, session.merchant);

    if (!performance || performance.campaign.merchantId !== session.merchant.id) {
      return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
    }

    const campaign = performance.campaign;
    const input = parseCampaignSetupInput({
      id: campaign.id,
      merchantId: campaign.merchantId,
      title: campaign.title,
      subtitle: campaign.subtitle,
      goalType: campaign.goalType,
      ctaLabel: campaign.ctaLabel,
      successMetric: campaign.successMetric,
      targetUrl: campaign.targetUrl,
      isActive: campaign.isActive,
      accent: campaign.accent,
      gameType: campaign.gameType,
      logoMode: campaign.logoMode,
      logoText: campaign.logoText,
      logoUrl: campaign.logoUrl,
      presentation: {
        ...campaign.presentation,
        email,
      },
      actions: campaign.actions,
      rewardRules: campaign.rewardRules,
      prizes: performance.prizes.map((prize) => ({
        id: prize.id,
        label: prize.label,
        totalQuantity: prize.totalQuantity,
        probability: prize.probability,
        estimatedUnitCost: prize.estimatedUnitCost,
      })),
    }, session.merchant.id);
    const updatedCampaign = await updateCampaignSetup(input);

    return NextResponse.json({ campaign: updatedCampaign });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Mise à jour impossible" },
      { status: getRequestSecurityErrorStatus(error) },
    );
  }
}

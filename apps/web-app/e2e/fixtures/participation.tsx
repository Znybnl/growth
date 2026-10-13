"use client";
import { CampaignExperience } from "@/components/public/campaign-experience";
import { halloweenFixture } from "./halloween-wheel";
import type { PublicCampaign } from "@/lib/types";

export function ParticipationFixture({ preview = false, mechanic = "scratch", marketing = false }: {
  preview?: boolean; mechanic?: "scratch" | "wheel"; marketing?: boolean;
}) {
  const campaign: PublicCampaign = {
    ...halloweenFixture, id: "fixture-participation", gameType: mechanic,
    subtitle: "Jouez pour tenter votre chance", logoText: "Commerce fictif",
    merchantName: "Commerce fictif", merchantLogoText: "Commerce fictif",
    actions: marketing ? [{id:"fixture-instagram",kind:"instagram",label:"Suivez-nous",url:"https://example.test"}] : [],
    emailCaptureEnabled: false,
    prizes: [{...halloweenFixture.prizes[0], id:"fixture-prize",remainingQuantity:null,purchaseRequired:false}],
    presentation: {...halloweenFixture.presentation,
      heading:{...halloweenFixture.presentation.heading,fontFamily:"poppins",textColor:"#111827"},
      layout:{...halloweenFixture.presentation.layout,templateId:mechanic==="scratch"?"beauty-scratch-nude":"classic"},
    },
  };
  return <CampaignExperience campaignId={campaign.id} initialCampaign={campaign}
    isPreview={preview} previewToken={preview ? "fixture-preview-token" : undefined} />;
}

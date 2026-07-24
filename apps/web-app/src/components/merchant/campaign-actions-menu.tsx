"use client";

import {
  BarChart3,
  Download,
  Eye,
  ImageIcon,
  Mail,
  MoreVertical,
  QrCode,
} from "lucide-react";

import { DeleteCampaignButton } from "@/components/merchant/delete-campaign-button";
import { DuplicateCampaignButton } from "@/components/merchant/duplicate-campaign-button";
import { DuplicateCampaignToLocationsButton } from "@/components/merchant/duplicate-campaign-to-locations-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type CampaignActionsMenuProps = {
  campaignId: string;
  campaignTitle: string;
};

const itemClass =
  "min-h-9 cursor-pointer gap-2 rounded-[8px] px-2.5 py-2 text-sm font-medium text-graphite focus:bg-sky-wash";

export function CampaignActionsMenu({
  campaignId,
  campaignTitle,
}: CampaignActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-[8px] border-border bg-white text-graphite hover:bg-sky-wash"
          aria-label="Ouvrir les actions de la campagne"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[min(264px,calc(100vw-24px))] rounded-[8px] border-border bg-white p-1.5 shadow-product-card"
      >
        <DropdownMenuItem className={itemClass} asChild>
          <a href={`/campaign/${campaignId}?preview=1`} target="_blank" rel="noreferrer">
            <Eye className="h-4 w-4" />
            Prévisualiser
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem className={itemClass} asChild>
          <a href={`/data?campaign=${campaignId}`}>
            <BarChart3 className="h-4 w-4" />
            Données
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className={itemClass} asChild>
          <a href={`/api/campaigns/${campaignId}/qr`}>
            <QrCode className="h-4 w-4" />
            Exporter le QR code
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem className={itemClass} asChild>
          <a href={`/campaigns/${campaignId}/poster`}>
            <ImageIcon className="h-4 w-4" />
            Personnaliser l&apos;affiche
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem className={itemClass} asChild>
          <a href={`/campaigns/${campaignId}/email`}>
            <Mail className="h-4 w-4" />
            Personnaliser l&apos;e-mail de gain
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem className={itemClass} asChild>
          <a href={`/api/campaigns/${campaignId}/poster`}>
            <Download className="h-4 w-4" />
            Télécharger l&apos;affiche A4 / A5
          </a>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <div className="space-y-1">
          <DuplicateCampaignButton
            campaignId={campaignId}
            variant="menu"
          />
          <DuplicateCampaignToLocationsButton campaignId={campaignId} />
          <DeleteCampaignButton
            campaignId={campaignId}
            campaignTitle={campaignTitle}
            variant="menu"
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

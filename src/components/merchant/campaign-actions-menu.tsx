"use client";

import {
  Download,
  ImageIcon,
  Mail,
  MoreVertical,
  QrCode,
} from "lucide-react";

import { DeleteCampaignButton } from "@/components/merchant/delete-campaign-button";
import { DuplicateCampaignButton } from "@/components/merchant/duplicate-campaign-button";
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
  "min-h-9 cursor-pointer gap-2 rounded-[8px] px-2.5 py-2 text-sm font-medium text-[#182033] focus:bg-linen-canvas";

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
          className="h-9 w-9 rounded-[8px] border-border bg-white text-[#182033] hover:bg-linen-canvas"
          aria-label="Ouvrir les actions de la campagne"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[min(264px,calc(100vw-24px))] rounded-[8px] border-border bg-white p-1.5 shadow-[0_18px_40px_rgba(122,136,166,0.14)]"
      >
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
            Personnaliser l&apos;email
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem className={itemClass} asChild>
          <a href={`/api/campaigns/${campaignId}/poster`}>
            <Download className="h-4 w-4" />
            Télécharger l&apos;affiche A4
          </a>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <div className="space-y-1">
          <DuplicateCampaignButton
            campaignId={campaignId}
            variant="menu"
          />
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

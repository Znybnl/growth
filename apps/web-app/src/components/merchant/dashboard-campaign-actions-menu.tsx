"use client";

import { BarChart3, Eye, MoreVertical, Pencil } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type DashboardCampaignActionsMenuProps = {
  campaignId: string;
};

const itemClass =
  "min-h-9 cursor-pointer gap-2 rounded-[8px] px-2.5 py-2 text-sm font-medium text-[#182033] focus:bg-linen-canvas";

export function DashboardCampaignActionsMenu({
  campaignId,
}: DashboardCampaignActionsMenuProps) {
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
        className="w-[min(220px,calc(100vw-24px))] rounded-[8px] border-border bg-white p-1.5 shadow-[0_18px_40px_rgba(122,136,166,0.14)]"
      >
        <DropdownMenuItem className={itemClass} asChild>
          <Link href={`/campaigns/${campaignId}/edit`} prefetch={false}>
            <Pencil className="h-4 w-4" />
            Modifier
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className={itemClass} asChild>
          <Link href={`/data?campaign=${campaignId}`} prefetch={false}>
            <BarChart3 className="h-4 w-4" />
            Données
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className={itemClass} asChild>
          <Link
            href={`/campaign/${campaignId}?preview=1`}
            prefetch={false}
            target="_blank"
            rel="noreferrer"
          >
            <Eye className="h-4 w-4" />
            Prévisualiser
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

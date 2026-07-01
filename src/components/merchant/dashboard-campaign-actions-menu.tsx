"use client";

import Link from "next/link";
import { BarChart3, Eye, MoreVertical, Pencil } from "lucide-react";

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

export function DashboardCampaignActionsMenu({
  campaignId,
}: DashboardCampaignActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-[10px] text-[#667085] hover:bg-[#f0f4fe] hover:text-[#111827]"
          aria-label="Ouvrir les actions de la campagne"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44 rounded-[12px]">
        <DropdownMenuItem asChild className="cursor-pointer gap-2">
          <Link href={`/campaigns/${campaignId}/edit`} prefetch={false}>
            <Pencil className="h-4 w-4" />
            Modifier
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer gap-2">
          <Link href={`/data?campaign=${campaignId}`} prefetch={false}>
            <BarChart3 className="h-4 w-4" />
            Données
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer gap-2">
          <Link href={`/campaign/${campaignId}`} prefetch={false} target="_blank">
            <Eye className="h-4 w-4" />
            Prévisualiser
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

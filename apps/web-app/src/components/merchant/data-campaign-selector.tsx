"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CampaignOption = {
  id: string;
  title: string;
  scans: number;
};

type DataCampaignSelectorProps = {
  campaigns: CampaignOption[];
  selectedCampaignId: string;
  query?: string;
  emailStatus?: "attention";
};

export function DataCampaignSelector({
  campaigns,
  selectedCampaignId,
  query,
  emailStatus,
}: DataCampaignSelectorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function selectCampaign(campaignId: string) {
    const params = new URLSearchParams({ campaign: campaignId });
    if (query) params.set("q", query);
    if (emailStatus) params.set("emailStatus", emailStatus);

    startTransition(() => {
      router.push(`/data?${params.toString()}`);
    });
  }

  return (
    <div className="relative min-w-0 flex-1" aria-busy={isPending}>
      <label htmlFor="data-campaign" className="okado-label mb-2 block">
        Campagne
      </label>
      <Select
        value={selectedCampaignId}
        onValueChange={selectCampaign}
        disabled={isPending}
      >
        <SelectTrigger id="data-campaign" className={isPending ? "cursor-wait" : undefined}>
          <SelectValue placeholder="Sélectionner une campagne" />
        </SelectTrigger>
        <SelectContent>
          {campaigns.map((campaign) => (
            <SelectItem key={campaign.id} value={campaign.id}>
              <span className="flex min-w-0 flex-1 items-center justify-between gap-4">
                <span className="min-w-0 truncate">{campaign.title}</span>
                <span className="shrink-0 text-xs font-medium text-[#60708b]">
                  {campaign.scans.toLocaleString("fr-FR")} scans
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isPending ? (
        <span className="pointer-events-none absolute right-10 bottom-3.5 text-[#60708b]">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        </span>
      ) : null}
    </div>
  );
}
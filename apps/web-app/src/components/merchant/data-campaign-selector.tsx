"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ChevronDown, Loader2 } from "lucide-react";

type CampaignOption = {
  id: string;
  title: string;
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
      <select
        id="data-campaign"
        value={selectedCampaignId}
        onChange={(event) => selectCampaign(event.target.value)}
        disabled={isPending}
        className="h-12 w-full cursor-pointer appearance-none rounded-[14px] border border-[#d7e0ed] bg-white px-4 pr-12 text-sm font-semibold text-[#182033] outline-none transition focus:border-primary-action-accent focus:ring-2 focus:ring-primary-action-accent/15 disabled:cursor-wait disabled:opacity-70"
      >
        {campaigns.map((campaign) => (
          <option key={campaign.id} value={campaign.id}>
            {campaign.title}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-4 bottom-3.5 text-[#60708b]">
        {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ChevronDown className="size-4" aria-hidden="true" />}
      </span>
    </div>
  );
}

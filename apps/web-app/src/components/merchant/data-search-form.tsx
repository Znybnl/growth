"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type DataSearchFormProps = {
  campaignId: string;
  initialValue: string;
};

export function DataSearchForm({ campaignId, initialValue }: DataSearchFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialValue);
  const clearParams = new URLSearchParams(searchParams.toString());
  clearParams.set("campaign", campaignId);
  clearParams.delete("q");
  clearParams.delete("code");
  clearParams.delete("page");

  function apply(nextValue: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("campaign", campaignId);
    params.delete("page");

    const trimmed = nextValue.trim();
    if (trimmed) {
      params.set("q", trimmed);
    } else {
      params.delete("q");
    }

    const queryString = params.toString();
    router.replace(queryString ? `/data?${queryString}` : "/data");
  }

  return (
    <form
      action="/data"
      method="get"
      className="min-w-0 max-w-2xl"
      onSubmit={(event) => {
        event.preventDefault();
        apply(value);
      }}
    >
      <input type="hidden" name="campaign" value={campaignId} />
      {searchParams.get("emailStatus") === "attention" ? <input type="hidden" name="emailStatus" value="attention" /> : null}
      <label htmlFor="results-contact-search" className="mb-2 block text-sm font-semibold text-carbon">Rechercher dans les contacts de cette campagne</label>
      <div className="flex gap-3">
        <input
          id="results-contact-search"
          name="q"
          type="search"
          value={value}
          onChange={(event) => {
            const nextValue = event.target.value;
            setValue(nextValue);

            if (!nextValue) {
              apply("");
            }
          }}
          placeholder="Rechercher par code de retrait ou e-mail client"
          className="min-w-0 w-full rounded-[12px] border border-[#cfcfcf] bg-white px-4 py-3 text-base text-carbon outline-none focus:border-aubergine focus:ring-2 focus:ring-aubergine/15 sm:text-sm"
        />
        {value ? (
          <a
            href={`/data?${clearParams.toString()}`}
            className="cursor-pointer rounded-[4px] border border-border bg-white px-4 py-3 text-sm font-semibold text-carbon hover:bg-purple-haze"
          >
            Effacer
          </a>
        ) : null}
      </div>
    </form>
  );
}

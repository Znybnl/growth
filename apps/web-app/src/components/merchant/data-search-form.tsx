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
      className="min-w-[280px] flex-1"
      onSubmit={(event) => {
        event.preventDefault();
        apply(value);
      }}
    >
      <div className="flex gap-3">
        <input
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
          className="w-full rounded-[12px] border border-[#cfcfcf] bg-white px-4 py-3 text-sm text-carbon outline-none focus:border-aubergine focus:ring-2 focus:ring-aubergine/15"
        />
        {value ? (
          <button
            type="button"
            onClick={() => {
              setValue("");
              apply("");
            }}
            className="cursor-pointer rounded-[4px] border border-border bg-white px-4 py-3 text-sm font-semibold text-carbon hover:bg-purple-haze"
          >
            Effacer
          </button>
        ) : null}
      </div>
    </form>
  );
}

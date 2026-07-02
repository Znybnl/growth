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
          className="w-full rounded-[18px] border border-[#d7e0ed] bg-white px-4 py-3 text-sm text-[#182033] outline-none"
        />
        {value ? (
          <button
            type="button"
            onClick={() => {
              setValue("");
              apply("");
            }}
            className="cursor-pointer rounded-[18px] border border-[#d7e0ed] bg-white px-4 py-3 text-sm font-semibold text-[#182033]"
          >
            Effacer
          </button>
        ) : null}
      </div>
    </form>
  );
}

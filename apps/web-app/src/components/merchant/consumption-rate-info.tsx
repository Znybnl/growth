import { Info } from "lucide-react";

export function ConsumptionRateInfo({ id }: { id: string }) {
  return (
    <span className="group relative inline-flex shrink-0 align-middle">
      <button
        type="button"
        aria-label="À propos du taux de consommation"
        aria-describedby={id}
        className="inline-flex size-5 items-center justify-center rounded-full text-ash transition hover:text-aubergine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aubergine/40"
      >
        <Info className="size-4" aria-hidden="true" />
      </button>
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none invisible absolute left-1/2 top-full z-30 mt-2 w-64 -translate-x-1/2 rounded-xl border border-border bg-white p-3 text-left text-xs font-normal normal-case leading-5 text-graphite opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
      >
        Taux de consommation = lots retirés ÷ lots gagnés × 100. Les lots à stock illimité sont inclus.
      </span>
    </span>
  );
}

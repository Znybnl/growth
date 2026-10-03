import Link from "next/link";
import { Star } from "lucide-react";

export function BrandMark({ subtitle }: { subtitle: string }) {
  return (
    <Link href="/" className="mr-3 inline-flex shrink-0 items-center gap-2 sm:mr-0 sm:gap-3" aria-label="Retour à l'accueil Okado">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] bg-[#6c00f6] text-white shadow-[0_0_24px_rgba(108,0,246,0.20)]">
        <Star className="h-5 w-5 fill-white text-white" aria-hidden="true" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[17px] font-bold tracking-[-0.03em] text-[#0f172b]">Okado</span>
        <span className="mt-1 hidden text-[11px] font-medium text-[#64748b] sm:block">{subtitle}</span>
      </span>
    </Link>
  );
}

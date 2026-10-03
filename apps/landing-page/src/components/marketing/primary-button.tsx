import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function PrimaryButton({ children, href }: { children: ReactNode; href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#6c00f6] px-5 py-3 text-[15px] font-semibold text-white shadow-[0_16px_36px_rgba(108,0,246,0.24)] transition hover:-translate-y-0.5 hover:bg-[#5700ce] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6c00f6]"
    >
      {children}
      <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
    </Link>
  );
}

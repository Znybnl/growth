import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type AccountSectionCardProps = {
  eyebrow: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  id?: string;
};

export function AccountSectionCard({
  eyebrow,
  title,
  description,
  icon: Icon,
  children,
  className,
  id,
}: AccountSectionCardProps) {
  return (
    <section id={id} className={cn("okado-card okado-form-section scroll-mt-28", className)}>
      <div className="okado-form-section__header flex items-start gap-3 border-b border-border/70 pb-5">
        {Icon ? (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[4px] bg-purple-haze text-aubergine">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        ) : null}
        <div>
          <p className="okado-label">{eyebrow}</p>
          <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-graphite">{title}</h2>
          {description ? <p className="mt-1.5 max-w-2xl text-sm leading-6 text-ash">{description}</p> : null}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

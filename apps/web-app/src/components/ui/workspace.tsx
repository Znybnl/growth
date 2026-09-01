import * as React from "react";

import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("okado-page-header", className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="okado-label">{eyebrow}</p> : null}
        <h1 className="okado-page-title mt-3">{title}</h1>
        {description ? <p className="mt-4 max-w-3xl text-sm leading-6 text-ash">{description}</p> : null}
      </div>
      {actions ? <div className="okado-action-row flex flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}

export function SectionCard({ className, ...props }: React.ComponentProps<"section">) {
  return <section className={cn("okado-card okado-section-card", className)} {...props} />;
}

export function ActionBar({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("okado-action-bar", className)} {...props} />;
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("okado-empty-state", className)}>
      <div className="okado-empty-state__mark" aria-hidden="true">—</div>
      <h2 className="okado-section-title mt-4">{title}</h2>
      {description ? <p className="mt-2 max-w-md text-sm leading-6 text-ash">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ResponsiveTable({
  children,
  mobile,
  className,
}: {
  children: React.ReactNode;
  mobile?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("okado-responsive-table", className)}>
      <div className="okado-responsive-table__desktop">{children}</div>
      {mobile ? <div className="okado-responsive-table__mobile">{mobile}</div> : null}
    </div>
  );
}

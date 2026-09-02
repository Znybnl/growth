import * as React from "react";

import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
};

export function PageHeader({ eyebrow, title, description, actions, icon, className }: PageHeaderProps) {
  return (
    <header className={cn("okado-page-header", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? <span className="okado-page-header__icon" aria-hidden="true">{icon}</span> : null}
        <div className="min-w-0">
          {eyebrow ? <p className="okado-label">{eyebrow}</p> : null}
          <h1 className="okado-page-title mt-3">{title}</h1>
          {description ? <p className="mt-4 max-w-3xl text-sm leading-6 text-ash">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="okado-action-row flex flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}

export function SectionCard({ className, ...props }: React.ComponentProps<"section">) {
  return <section className={cn("okado-card okado-section-card", className)} {...props} />;
}

export function MetricCard({
  label,
  value,
  detail,
  icon,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  detail?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("okado-card okado-metric-card", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="okado-label">{label}</p>
        {icon ? <span className="okado-metric-card__icon" aria-hidden="true">{icon}</span> : null}
      </div>
      <p className="okado-metric-card__value">{value}</p>
      {detail ? <p className="okado-metric-card__detail">{detail}</p> : null}
    </section>
  );
}

export function FormSection({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("okado-card okado-form-section", className)}>
      <div className="okado-form-section__header">
        <div className="min-w-0">
          {eyebrow ? <p className="okado-label">{eyebrow}</p> : null}
          <h2 className="okado-section-title mt-2">{title}</h2>
          {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-ash">{description}</p> : null}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function LoadingSkeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-[8px] bg-purple-haze", className)} {...props} />;
}

export function StatusNotice({
  tone = "info",
  role,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  tone?: "success" | "warning" | "danger" | "info";
}) {
  return (
    <div
      role={role ?? (tone === "danger" ? "alert" : "status")}
      className={cn("okado-status-notice", `okado-notice-${tone}`, className)}
      {...props}
    />
  );
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
  framed = false,
  className,
}: {
  children: React.ReactNode;
  mobile?: React.ReactNode;
  framed?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("okado-responsive-table", framed && "okado-table-frame", className)}>
      <div className="okado-responsive-table__desktop">{children}</div>
      {mobile ? <div className="okado-responsive-table__mobile">{mobile}</div> : null}
    </div>
  );
}

export { RowActionsMenu } from "@/components/ui/row-actions-menu";

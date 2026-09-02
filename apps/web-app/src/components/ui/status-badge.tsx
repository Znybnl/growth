import * as React from "react";

import { cn } from "@/lib/utils";

type StatusBadgeProps = React.ComponentProps<"span"> & {
  tone?: "active" | "warning" | "muted" | "danger" | "info";
};

export function StatusBadge({ className, tone = "muted", ...props }: StatusBadgeProps) {
  return <span className={cn("okado-status-badge", `okado-status-${tone}`, className)} {...props} />;
}

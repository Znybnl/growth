"use client";

import { MoreVertical } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type RowAction = {
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
};

export function RowActionsMenu({ actions }: { actions: RowAction[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="okado-row-action-trigger h-9 w-9 rounded-[4px] border-border bg-white text-carbon hover:bg-purple-haze"
          aria-label="Ouvrir les actions de la ligne"
        >
          <MoreVertical className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.label}
            disabled={action.disabled}
            onSelect={action.onSelect}
            className={action.destructive ? "text-destructive focus:text-destructive" : undefined}
          >
            {action.icon}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

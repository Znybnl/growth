import { BookOpen, BriefcaseBusiness, Gauge, HandCoins, Settings2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type PlatformAdminNavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const platformAdminNavigationItems: PlatformAdminNavigationItem[] = [
  { href: "/admin", label: "Pilotage", icon: Gauge },
  { href: "/admin/prize-suggestions", label: "Suggestions de lots", icon: HandCoins },
  { href: "/backgrounds", label: "Bibliothèque", icon: BookOpen },
  { href: "/affiliates", label: "Affiliation", icon: BriefcaseBusiness },
  { href: "/support", label: "Supervision", icon: Settings2 },
];

export function getPlatformAdminNavigationItems(isSaasAdmin: boolean) {
  return isSaasAdmin ? platformAdminNavigationItems : [];
}

import {
  AtSign,
  Link,
  Map,
  Music,
  Star,
  Users,
} from "lucide-react";

import { ActionKind } from "@/lib/types";

type SocialChannel = ActionKind | "googleReview" | "custom";

const channelIcons = {
  google: Star,
  googleReview: Star,
  instagram: AtSign,
  facebook: Users,
  tiktok: Music,
  tripadvisor: Map,
  crm: Users,
  custom: Link,
} as const;

export function SocialChannelIcon({
  channel,
  className = "h-4 w-4",
}: {
  channel: SocialChannel;
  className?: string;
}) {
  const Icon = channelIcons[channel];

  return (
    <span
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-wash text-signal-blue"
      aria-hidden="true"
    >
      <Icon className={className} />
    </span>
  );
}

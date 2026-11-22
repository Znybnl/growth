import type { GamePageTemplateId } from "@/lib/types";

export const SUNSET_DRIVE = {
  wheelId: "travel-sunset-drive", scratchId: "travel-scratch-sunset-drive",
  artwork: "/images/templates/travel/sunset-drive.webp",
  ivory: "#fff0d6", coral: "#ee3949", plum: "#50062f",
} as const;

export function isSunsetDriveTemplate(id?: GamePageTemplateId) {
  return id === SUNSET_DRIVE.wheelId || id === SUNSET_DRIVE.scratchId;
}

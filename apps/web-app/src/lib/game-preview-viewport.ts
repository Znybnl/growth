/** Representative usable mobile viewport, allowing room for browser chrome.
 * Not a promise about every device: live and interactive previews share it. */
export const GAME_PREVIEW_VIEWPORT = { width: 390, height: 740 } as const;
export const WIZARD_PHONE_SIZE = { width: 414, height: 764 } as const;

/**
 * Opens the full-page preview on narrow screens and the mobile viewport dialog on desktop.
 * The breakpoint matches the desktop behaviour defined for the merchant workspace.
 */
export function openCampaignPreview(
  campaignId: string,
  onDesktopOpen: () => void,
  onMobileNavigate: (path: string) => void,
  previewPath?: string,
) {
  if (typeof window === "undefined") return;

  if (window.matchMedia("(min-width: 768px)").matches) {
    onDesktopOpen();
    return;
  }

  onMobileNavigate(previewPath ?? `/campaign/${campaignId}?preview=1`);
}

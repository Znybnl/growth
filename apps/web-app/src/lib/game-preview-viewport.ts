/** Representative usable mobile viewport, allowing room for browser chrome.
 * Not a promise about every device: live and interactive previews share it. */
export const GAME_PREVIEW_VIEWPORT = { width: 390, height: 740 } as const;
export const WIZARD_PHONE_SIZE = { width: 414, height: 764 } as const;

/**
 * Opens a separate full-page preview on mobile and the viewport dialog on desktop.
 * The breakpoint matches the desktop behaviour defined for the merchant workspace.
 */
export function openCampaignPreview(
  campaignId: string,
  onDesktopOpen: () => void,
  previewPath?: string,
  reservedWindow?: Window | null,
) {
  if (typeof window === "undefined") return;

  if (window.matchMedia("(min-width: 768px)").matches) {
    onDesktopOpen();
    return;
  }

  const tab = reservedWindow && !reservedWindow.closed ? reservedWindow : reserveCampaignPreviewWindow();
  if (!tab) { onDesktopOpen(); return; }
  tab.location.replace(previewPath ?? `/campaign/${encodeURIComponent(campaignId)}?preview=1`);
}

/** Call during the click, before an asynchronous save, to avoid popup blocking. */
export function reserveCampaignPreviewWindow() {
  if (typeof window === "undefined" || window.matchMedia("(min-width: 768px)").matches) return null;
  const tab = window.open("about:blank", "_blank");
  if (tab) {
    tab.opener = null;
    tab.document.title = "Prévisualisation — Okado";
    tab.document.body.textContent = "Préparation de votre jeu…";
  }
  return tab;
}

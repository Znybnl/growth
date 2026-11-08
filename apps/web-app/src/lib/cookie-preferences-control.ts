export const OPEN_COOKIE_PREFERENCES = "okado:open-cookie-preferences";

/** Opens the existing panel. It never changes or manufactures a consent choice. */
export function openCookiePreferences(trigger: HTMLElement | null) {
  window.dispatchEvent(new CustomEvent(OPEN_COOKIE_PREFERENCES, { detail: { trigger } }));
}

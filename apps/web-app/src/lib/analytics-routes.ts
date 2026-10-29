/** Closed route families only: never send user-defined path segments. */
export const APPLICATION_ANALYTICS_PAGES = [
  "/", "/connexion", "/inscription", "/connexion/google/callback", "/onboarding", "/merchant",
  "/campaigns", "/campaigns/new", "/campaigns/new/guided",
  "/campaigns/[id]/edit", "/campaigns/[id]/edit/guided", "/campaigns/[id]/poster", "/campaigns/[id]/email",
  "/data", "/account", "/locations", "/backgrounds", "/affiliates", "/caisse", "/support",
  "/admin", "/admin/campaigns", "/admin/campaigns/new", "/admin/campaigns/[id]/edit", "/admin/campaigns/[id]/poster", "/admin/prize-suggestions",
  "/campaign/[id]", "/campaign/[id]/preview-embed", "/redeem/[code]",
] as const;

const routes = APPLICATION_ANALYTICS_PAGES.map(route => ({
  route,
  pattern: new RegExp("^" + route.replace(/\[(?:id|code)\]/g, "[^/?#]+") + "$"),
}));

export function safeApplicationAnalyticsPage(pathname: string) {
  if (/[?#]/.test(pathname)) return undefined;
  return routes.find(({ pattern }) => pattern.test(pathname))?.route;
}

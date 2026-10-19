export function isPublicGamePage(pathname: string | null): boolean {
  return pathname?.startsWith("/campaign/") ?? false;
}

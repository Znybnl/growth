/**
 * Keep the user-selected image composition identical between the editor
 * preview and the public game page.
 *
 * The subtle contrast veil is part of the real game rendering. It must not
 * be replaced by a preview-only filter because that makes the selected image
 * look darker while editing than it does to players.
 */
export function userBackgroundImageStyle(imageUrl: string) {
  return `linear-gradient(rgba(0,0,0,0.08), rgba(0,0,0,0.18)), url("${imageUrl}")`;
}

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

// These files are part of the preview and redemption contract. Keeping this
// list explicit prevents a partial tree/deployment from silently removing the
// customer-facing preview flow.
const requiredFiles = [
  "apps/web-app/src/app/api/public/preview-token/route.ts",
  "apps/web-app/src/components/merchant/campaign-live-preview.tsx",
  "apps/web-app/src/lib/preview-token.ts",
  "apps/web-app/src/lib/session-security-server.ts",
  "supabase/migrations/20260802_preview_participations.sql",
  "supabase/migrations/20260803_cashier_force_redemption.sql",
];

const missing = requiredFiles.filter((file) => !existsSync(join(root, file)));
if (missing.length > 0) {
  console.error("Missing required source files:");
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

const extensions = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".sql"]);
const rootsToScan = ["apps/web-app/src", "supabase/migrations"];
const invalidUtf8 = [];

function scan(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const filePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      scan(filePath);
      continue;
    }
    const extension = entry.name.slice(entry.name.lastIndexOf("."));
    if (!extensions.has(extension)) continue;
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(readFileSync(filePath));
    } catch {
      invalidUtf8.push(relative(root, filePath));
    }
  }
}

for (const directory of rootsToScan) scan(join(root, directory));
if (invalidUtf8.length > 0) {
  console.error("Files with invalid UTF-8 encoding:");
  for (const file of invalidUtf8) console.error(`- ${file}`);
  process.exit(1);
}

console.log(`Source verification passed (${requiredFiles.length} required files, UTF-8 scan complete).`);

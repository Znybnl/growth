import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type CampaignLocalSettings = {
  buttonTextSizePx?: number;
  blockSpacingPx?: number;
};

type CampaignLocalSettingsStore = Record<string, CampaignLocalSettings>;

const storePath = path.join(process.cwd(), ".codex", "campaign-local-settings.json");

let cache: CampaignLocalSettingsStore | null = null;

async function readStore() {
  if (cache) {
    return cache;
  }

  try {
    const raw = await readFile(storePath, "utf8");
    cache = JSON.parse(raw) as CampaignLocalSettingsStore;
  } catch {
    cache = {};
  }

  return cache;
}

export async function getCampaignLocalSettings(campaignId: string) {
  const store = await readStore();
  return store[campaignId] ?? {};
}

export async function setCampaignLocalSettings(
  campaignId: string,
  settings: CampaignLocalSettings,
) {
  const store = await readStore();
  store[campaignId] = {
    ...store[campaignId],
    ...settings,
  };

  cache = store;
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
}

import {
  CampaignEmailSettings,
  CampaignPosterSettings,
  GamePageTemplateId,
  TextFont,
} from "@/lib/types";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

type CampaignLocalSettings = {
  buttonTextSizePx?: number;
  buttonIsBold?: boolean;
  blockSpacingPx?: number;
  participationIntervalDays?: number;
  headingFontFamily?: TextFont;
  headingFontWeight?: number;
  gamePageTemplateId?: GamePageTemplateId;
  logoMode?: "none" | "image" | "text";
  logoText?: string;
  prizeSettings?: Record<string, { usageConditions?: string }>;
  poster?: Partial<CampaignPosterSettings>;
  email?: Partial<CampaignEmailSettings>;
  compliance?: {
    rulesVersion: number;
    status: "draft" | "active";
    lastSavedAt: string;
    publishedAt?: string;
    configurationVersion: string;
  };
};

type CampaignLocalSettingsStore = Record<string, CampaignLocalSettings>;

const storePath = path.join(process.cwd(), ".codex", "campaign-local-settings.json");

let cache: CampaignLocalSettingsStore | null = null;

async function readFileStore() {
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

async function writeFileStore(store: CampaignLocalSettingsStore) {
  cache = store;
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
}

async function getSupabaseCampaignLocalSettings(campaignId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("campaigns")
    .select("campaign_local_settings")
    .eq("id", campaignId)
    .maybeSingle<{ campaign_local_settings: CampaignLocalSettings | null }>();

  if (error) {
    if (error.message.includes("campaign_local_settings")) {
      return null;
    }

    throw new Error(`Lecture des réglages de campagne impossible: ${error.message}`);
  }

  return data?.campaign_local_settings ?? null;
}

async function setSupabaseCampaignLocalSettings(
  campaignId: string,
  settings: CampaignLocalSettings,
) {
  const current = (await getSupabaseCampaignLocalSettings(campaignId)) ?? {};
  const next = {
    ...current,
    ...settings,
  };
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("campaigns")
    .update({ campaign_local_settings: next })
    .eq("id", campaignId);

  if (error) {
    if (error.message.includes("campaign_local_settings")) {
      return null;
    }

    throw new Error(`Écriture des réglages de campagne impossible: ${error.message}`);
  }

  return next;
}

export async function getCampaignLocalSettings(campaignId: string) {
  if (isSupabaseConfigured()) {
    const supabaseSettings = await getSupabaseCampaignLocalSettings(campaignId);

    if (supabaseSettings) {
      return supabaseSettings;
    }

    if (process.env.NODE_ENV === "production") {
      throw new Error("Les réglages de campagne sont indisponibles en base de données.");
    }

    const fileStore = await readFileStore();
    const fallback = fileStore[campaignId];

    if (fallback) {
      await setSupabaseCampaignLocalSettings(campaignId, fallback);
      return fallback;
    }

    return {};
  }

  const store = await readFileStore();
  return store[campaignId] ?? {};
}

export async function setCampaignLocalSettings(
  campaignId: string,
  settings: CampaignLocalSettings,
) {
  if (isSupabaseConfigured()) {
    const saved = await setSupabaseCampaignLocalSettings(campaignId, settings);

    if (saved) {
      return saved;
    }

    if (process.env.NODE_ENV === "production") {
      throw new Error("Les réglages de campagne ne peuvent pas être enregistrés hors de la base de données.");
    }
  }

  const store = await readFileStore();
  store[campaignId] = {
    ...store[campaignId],
    ...settings,
  };

  await writeFileStore(store);
  return store[campaignId];
}

